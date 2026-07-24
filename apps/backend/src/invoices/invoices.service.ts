import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InvoiceStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceNumberService } from './invoice-number.service';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly invoiceNumberService: InvoiceNumberService,
  ) {}
  async create(dto: CreateInvoiceDto) {
  const number =
    await this.invoiceNumberService.generate();

  const subtotal = dto.items.reduce(
    (sum, item) =>
      sum + item.quantity * item.unitPrice,
    0,
  );

  const discount = dto.discount ?? 0;

  const tax = dto.tax ?? 0;

  const total =
    subtotal - discount + tax;

  return this.prisma.$transaction(
    async (tx) => {      const invoice =
        await tx.invoice.create({
          data: {
            number,

            subtotal,

            discount,

            tax,

            total,

            status:
              dto.status ??
              InvoiceStatus.DRAFT,

            dueDate: dto.dueDate
              ? new Date(dto.dueDate)
              : null,

            customer: {
              connect: {
                id: dto.customerId,
              },
            },

            ...(dto.subscriptionId && {
              subscription: {
                connect: {
                  id: dto.subscriptionId,
                },
              },
            }),

            ...(dto.contractId && {
              contract: {
                connect: {
                  id: dto.contractId,
                },
              },
            }),
          },
        });
              await tx.invoiceItem.createMany({
        data: dto.items.map((item) => ({
          invoiceId: invoice.id,

          description:
            item.description,

          quantity: item.quantity,

          unitPrice: item.unitPrice,

          discount:
            item.discount ?? 0,

          total:
            item.quantity *
              item.unitPrice -
            (item.discount ?? 0),

          productId:
            item.productId,
        })),
      });
            const createdInvoice =
        await tx.invoice.findUnique({
          where: {
            id: invoice.id,
          },

          include: {
            customer: true,
            items: true,
            contract: true,
            subscription: true,
            payments: true,
          },
        });
              if (
        createdInvoice?.customer.email
      ) {
        await this.mailService.sendInvoice(
          createdInvoice.customer.email,
          createdInvoice.number,
          Number(createdInvoice.total),
        );
      }
            await this.notificationsService.create({
        title: 'Nouvelle facture',

        message:
          `Facture ${createdInvoice?.number} créée.`,

        userId:
          createdInvoice?.customer.userId,
      });
            await this.auditService.log({
        action: 'CREATE',

        entity: 'Invoice',

        entityId:
          createdInvoice?.id,

        description:
          `Création de la facture ${createdInvoice?.number}`,
      });
            return createdInvoice;
    },
  );
}
}
