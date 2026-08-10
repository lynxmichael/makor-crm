import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

import { SettingsService } from '../settings/settings.service';
import { PdfService } from '../common/pdf/pdf.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';

import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly pdfService: PdfService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  private readonly include = {
    customer: true,
    deal: true,
    createdBy: true,
    purchaseOrder: true,
    items: { include: { product: true } },
  } satisfies Prisma.QuoteInclude;

  async create(dto: CreateQuoteDto) {
    const vatRate = await this.settingsService.getVatRate();

    let subtotal = 0;
    let discount = 0;

    const items = dto.items.map((item) => {
      const lineDiscount = item.discount ?? 0;
      const total = item.quantity * item.unitPrice - lineDiscount;

      subtotal += total;
      discount += lineDiscount;

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: lineDiscount,
        total,

        ...(item.productId && {
          product: { connect: { id: item.productId } },
        }),
      };
    });

    const tax = subtotal * vatRate;
    const total = subtotal + tax;

    return this.prisma.$transaction(async (tx) => {
      const count = await tx.quote.count();

      return tx.quote.create({
        data: {
          number: `DEV-${String(count + 1).padStart(6, '0')}`,

          title: dto.title,
          notes: dto.notes,

          subtotal,
          discount,
          tax,
          total,

          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,

          status: 'DRAFT',

          customer: { connect: { id: dto.customerId } },
          createdBy: { connect: { id: dto.createdById } },

          ...(dto.dealId && { deal: { connect: { id: dto.dealId } } }),

          items: { create: items },
        },

        include: this.include,
      });
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    customerId?: string;
  }) {
    const { page, limit, search, status, customerId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.QuoteWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { number: { contains: search, mode: 'insensitive' } },
                { title: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},

        status ? { status: status as any } : {},
        customerId ? { customerId } : {},
      ],
    };

    const [quotes, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        include: this.include,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.quote.count({ where }),
    ]);

    return {
      data: quotes,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: this.include,
    });

    if (!quote) {
      throw new NotFoundException('Devis introuvable');
    }

    return quote;
  }

  async update(id: string, dto: UpdateQuoteDto) {
    const existing = await this.findOne(id);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Seul un devis au statut "brouillon" peut être modifié.',
      );
    }

    return this.prisma.quote.update({
      where: { id },

      data: {
        title: dto.title,
        notes: dto.notes,

        validUntil:
          dto.validUntil !== undefined
            ? dto.validUntil
              ? new Date(dto.validUntil)
              : null
            : undefined,
      },

      include: this.include,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.quote.delete({ where: { id } });
  }

  private async buildPdf(quoteId: string): Promise<Buffer> {
    const quote = await this.findOne(quoteId);
    const org = await this.settingsService.getOrganizationSettings();

    return this.pdfService.generateCommercialDocument(
      {
        companyName: org.companyName,
        address: org.address,
        email: org.email,
        phone: org.phone,
      },
      {
        documentTitle: 'DEVIS',
        number: quote.number,
        date: quote.createdAt,
        validUntilOrDueDate: quote.validUntil,
        status: quote.status,
        customerName: quote.customer.companyName,
        customerAddress: quote.customer.address,
        customerEmail: quote.customer.email,
        customerPhone: quote.customer.phone,
        items: quote.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
          total: Number(item.total),
        })),
        subtotal: Number(quote.subtotal),
        discount: Number(quote.discount),
        tax: Number(quote.tax),
        total: Number(quote.total),
        currency: org.defaultCurrency,
        notes: quote.notes,
      },
    );
  }

  async getPdf(id: string) {
    const quote = await this.findOne(id);
    const pdf = await this.buildPdf(id);
    return { pdf, number: quote.number };
  }

  /** Envoie le devis par email au client, en pièce jointe PDF (CDC §4.8). */
  async send(id: string, userId?: string) {
    const quote = await this.findOne(id);

    if (!quote.customer.email) {
      throw new BadRequestException(
        "Le client n'a pas d'adresse email enregistrée.",
      );
    }

    const pdf = await this.buildPdf(id);

    await this.mailService.sendQuote(quote.customer.email, quote.number, {
      filename: `${quote.number}.pdf`,
      content: pdf,
    });

    const updated = await this.prisma.quote.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
      include: this.include,
    });

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'Quote',
      entityId: id,
      description: `Devis ${quote.number} envoyé au client`,
      userId,
    });

    return updated;
  }

  async accept(id: string) {
    const quote = await this.findOne(id);

    if (quote.status !== 'SENT') {
      throw new BadRequestException('Seul un devis envoyé peut être accepté.');
    }

    return this.prisma.quote.update({
      where: { id },
      data: { status: 'ACCEPTED' },
      include: this.include,
    });
  }

  async reject(id: string) {
    const quote = await this.findOne(id);

    if (quote.status !== 'SENT') {
      throw new BadRequestException('Seul un devis envoyé peut être refusé.');
    }

    return this.prisma.quote.update({
      where: { id },
      data: { status: 'REJECTED' },
      include: this.include,
    });
  }

  /**
   * Transforme un devis accepté en bon de commande, sans ressaisie
   * (CDC §4.8 "Transformation"). La création effective du bon de commande
   * est déléguée à PurchaseOrdersService pour éviter une dépendance
   * circulaire ; cette méthode ne fait que valider les préconditions et
   * renvoyer les données nécessaires.
   */
  async assertConvertible(id: string) {
    const quote = await this.findOne(id);

    if (quote.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'Seul un devis accepté peut être transformé en bon de commande.',
      );
    }

    if (quote.purchaseOrder) {
      throw new BadRequestException(
        'Ce devis a déjà été transformé en bon de commande.',
      );
    }

    return quote;
  }
}
