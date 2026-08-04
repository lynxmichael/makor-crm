import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { QuotesService } from '../quotes/quotes.service';
import { PdfService } from '../common/pdf/pdf.service';
import { SettingsService } from '../settings/settings.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';

import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { FromQuoteDto } from './dto/from-quote.dto';
import { SignPurchaseOrderDto } from './dto/sign-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotesService: QuotesService,
    private readonly pdfService: PdfService,
    private readonly settingsService: SettingsService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  private readonly include = {
    customer: true,
    quote: true,
    createdBy: true,
    contract: true,
    items: { include: { product: true } },
  } satisfies Prisma.PurchaseOrderInclude;

  private async nextNumber(tx: Prisma.TransactionClient) {
    const count = await tx.purchaseOrder.count();
    return `BC-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Transformation d'un devis accepté en bon de commande, sans ressaisie
   * (CDC §4.8). Reprend intégralement les lignes du devis.
   */
  async createFromQuote(quoteId: string, dto: FromQuoteDto, userId?: string) {
    const quote = await this.quotesService.assertConvertible(quoteId);

    const created = await this.prisma.$transaction(async (tx) => {
      const number = await this.nextNumber(tx);

      return tx.purchaseOrder.create({
        data: {
          number,
          amount: quote.total,
          paymentMethod: dto.paymentMethod,

          quote: { connect: { id: quote.id } },
          customer: { connect: { id: quote.customerId } },
          createdBy: { connect: { id: userId ?? quote.createdById } },

          items: {
            create: quote.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              ...(item.productId && {
                product: { connect: { id: item.productId } },
              }),
            })),
          },
        },

        include: this.include,
      });
    });

    await this.auditService.create({
      action: 'CREATE',
      entity: 'PurchaseOrder',
      entityId: created.id,
      description: `Bon de commande ${created.number} créé depuis le devis ${quote.number}`,
      userId,
    });

    return created;
  }

  async create(dto: CreatePurchaseOrderDto, userId: string) {
    const amount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    return this.prisma.$transaction(async (tx) => {
      const number = await this.nextNumber(tx);

      return tx.purchaseOrder.create({
        data: {
          number,
          amount,
          paymentMethod: dto.paymentMethod,

          customer: { connect: { id: dto.customerId } },
          createdBy: { connect: { id: userId } },

          items: {
            create: dto.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
              ...(item.productId && {
                product: { connect: { id: item.productId } },
              }),
            })),
          },
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
    scopeToUserId?: string;
  }) {
    const { page, limit, search, status, customerId , scopeToUserId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = {
      ...(scopeToUserId ? { customer: { assignedToId: scopeToUserId } } : {}),
      AND: [
        search ? { number: { contains: search, mode: 'insensitive' } } : {},
        status ? { status: status as any } : {},
        customerId ? { customerId } : {},
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: this.include,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: this.include,
    });

    if (!order) {
      throw new NotFoundException('Bon de commande introuvable');
    }

    return order;
  }

  async update(id: string, dto: UpdatePurchaseOrderDto) {
    const existing = await this.findOne(id);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Seul un bon de commande au statut "brouillon" peut être modifié.',
      );
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { paymentMethod: dto.paymentMethod },
      include: this.include,
    });
  }

  async remove(id: string) {
    const existing = await this.findOne(id);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Seul un bon de commande au statut "brouillon" peut être supprimé.',
      );
    }

    return this.prisma.purchaseOrder.delete({ where: { id } });
  }

  private async buildPdf(id: string): Promise<Buffer> {
    const order = await this.findOne(id);
    const org = await this.settingsService.getOrganizationSettings();

    return this.pdfService.generateCommercialDocument(
      {
        companyName: org.companyName,
        address: org.address,
        email: org.email,
        phone: org.phone,
      },
      {
        documentTitle: 'BON DE COMMANDE',
        number: order.number,
        date: order.createdAt,
        status: order.status,
        customerName: order.customer.companyName,
        customerAddress: order.customer.address,
        customerEmail: order.customer.email,
        customerPhone: order.customer.phone,
        items: order.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })),
        total: Number(order.amount),
        currency: org.defaultCurrency,
        extraLines: order.paymentMethod
          ? [{ label: 'Mode de règlement proposé', value: order.paymentMethod }]
          : undefined,
      },
    );
  }

  async getPdf(id: string) {
    const order = await this.findOne(id);
    const pdf = await this.buildPdf(id);
    return { pdf, number: order.number };
  }

  /** Envoie le bon de commande par email au client (CDC §4.8). */
  async send(id: string, userId?: string) {
    const order = await this.findOne(id);

    if (!order.customer.email) {
      throw new BadRequestException(
        "Le client n'a pas d'adresse email enregistrée.",
      );
    }

    if (order.status !== 'DRAFT') {
      throw new BadRequestException(
        'Ce bon de commande a déjà été envoyé.',
      );
    }

    const pdf = await this.buildPdf(id);

    await this.mailService.sendPurchaseOrder(
      order.customer.email,
      order.number,
      { filename: `${order.number}.pdf`, content: pdf },
    );

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
      include: this.include,
    });

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'PurchaseOrder',
      entityId: id,
      description: `Bon de commande ${order.number} envoyé au client`,
      userId,
    });

    return updated;
  }

  /**
   * Enregistre la signature du bon de commande (V1 : dépôt du scan signé
   * par email/GED — la signature électronique intégrée est repoussée en
   * V2, cf. CDC §5).
   */
  async sign(id: string, dto: SignPurchaseOrderDto, userId?: string) {
    const order = await this.findOne(id);

    if (order.status !== 'SENT') {
      throw new BadRequestException(
        'Seul un bon de commande envoyé peut être marqué comme signé.',
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signedDocumentPath: dto.signedDocumentPath,
      },
      include: this.include,
    });

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'PurchaseOrder',
      entityId: id,
      description: `Bon de commande ${order.number} marqué comme signé`,
      userId,
    });

    return updated;
  }

  async cancel(id: string, userId?: string) {
    const order = await this.findOne(id);

    if (order.status === 'SIGNED') {
      throw new BadRequestException(
        "Un bon de commande signé ne peut pas être annulé.",
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.include,
    });

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'PurchaseOrder',
      entityId: id,
      description: `Bon de commande ${order.number} annulé`,
      userId,
    });

    return updated;
  }
}
