import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

import { SettingsService } from '../settings/settings.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';

import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly invoiceNumberService: InvoiceNumberService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
    private readonly events: EventEmitter2
  ) {}

  async create(dto: CreateInvoiceDto) {
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
          product: {
            connect: {
              id: item.productId,
            },
          },
        }),
      };
    });

    const vatRate = await this.settingsService.getVatRate();
    const tax = subtotal * vatRate;
    const total = subtotal + tax;

    const number = await this.invoiceNumberService.generate();

    return this.prisma.invoice.create({
      data: {
        number,

        subtotal,
        discount,
        tax,
        total,

        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,

        status: dto.status,

        customer: {
          connect: {
            id: dto.customerId,
          },
        },

        ...(dto.contractId && {
          contract: {
            connect: {
              id: dto.contractId,
            },
          },
        }),

        items: {
          create: items,
        },
      },

      include: {
        customer: true,
        contract: true,
        payments: true,
        items: {
          include: {
            product: true,
          },
        },
      },
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

    const where: Prisma.InvoiceWhereInput = {
      AND: [
        search
          ? {
              number: {
                contains: search,
                mode: 'insensitive',
              },
            }
          : {},

        status
          ? {
              status: status as any,
            }
          : {},

        customerId ? { customerId } : {},
      ],
    };

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,

        include: {
          customer: true,
          contract: true,
          payments: true,
          items: true,
        },

        skip,
        take: limit,

        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.invoice.count({
        where,
      }),
    ]);

    return {
      data: invoices,

      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: {
        id,
      },

      include: {
        customer: true,
        contract: true,
        payments: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Facture introuvable');
    }

    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    await this.findOne(id);

    return this.prisma.invoice.update({
      where: {
        id,
      },

      data: {
        dueDate:
          dto.dueDate !== undefined
            ? dto.dueDate
              ? new Date(dto.dueDate)
              : null
            : undefined,

        status: dto.status,
      },

      include: {
        customer: true,
        contract: true,
        payments: true,
        items: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.invoice.delete({
      where: {
        id,
      },
    });
  }

  /**
   * Envoi de la facture au client, PDF joint.
   *
   * Le passage en SENT n'a lieu qu'après un envoi réussi : marquer la
   * facture comme émise alors que le message n'est jamais parti donnerait
   * une créance qu'on croit réclamée et que le client n'a jamais reçue.
   */
  async send(id: string, userId?: string) {
    const invoice = await this.findOne(id);

    if (!invoice.customer.email) {
      throw new BadRequestException(
        "Ce client n'a pas d'adresse e-mail enregistrée : renseignez-la sur sa fiche avant l'envoi.",
      );
    }

    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException("Une facture annulée ne peut pas être envoyée.");
    }

    const pdf = await this.invoicePdfService.generate(id);

    await this.mailService.sendInvoice(
      invoice.customer.email,
      invoice.number,
      Number(invoice.total),
      { filename: `${invoice.number}.pdf`, content: pdf },
    );

    // Une facture déjà réglée peut être renvoyée sur demande du client sans
    // repasser en « émise » : on ne régresse jamais un statut acquis.
    const updated = await this.prisma.invoice.update({
      where: { id },
      // `Invoice` ne porte pas de champ `sentAt` : la date d'envoi est
      // tracée dans le journal d'audit, ce qui suffit et évite une migration
      // pour une information qu'on ne filtre jamais.
      data: {
        ...(invoice.status === 'DRAFT' ? { status: 'SENT' as const } : {}),
      },
      include: {
        customer: true,
        contract: true,
        payments: true,
        items: { include: { product: true } },
      },
    });

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'Invoice',
      entityId: id,
      description: `Facture ${invoice.number} envoyée à ${invoice.customer.email}`,
      userId,
    });

    this.events.emit('workflow.trigger', {
      trigger: 'INVOICE_SENT',
      entityType: 'INVOICE',
      entityId: id,
      actorId: userId,
      payload: {
        number: invoice.number,
        total: Number(invoice.total),
        customerName: invoice.customer.companyName,
        customerEmail: invoice.customer.email,
        dueDate: invoice.dueDate,
      },
    });

    return updated;
  }

  async markAsPaid(id: string) {
    await this.findOne(id);

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'PAID' },
      include: { customer: true },
    });

    // Point d'accroche du moteur de workflow : la charge utile porte les
    // champs sur lesquels les conditions des règles peuvent s'appuyer.
    this.events.emit('workflow.trigger', {
      trigger: 'INVOICE_PAID',
      entityType: 'INVOICE',
      entityId: invoice.id,
      payload: {
        number: invoice.number,
        total: Number(invoice.total),
        customerId: invoice.customerId,
        customerName: invoice.customer.companyName,
        assignedToId: invoice.customer.assignedToId,
      },
    });

    return invoice;
  }

  async cancel(id: string) {
    await this.findOne(id);

    return this.prisma.invoice.update({
      where: {
        id,
      },

      data: {
        status: 'CANCELLED',
      },
    });
  }
}
