import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { PaymentStatus, InvoiceStatus } from '@prisma/client';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

import { AuditService } from '../audit/audit.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreatePaymentDto) {
    const invoice =
      await this.prisma.invoice.findUnique({
        where: {
          id: dto.invoiceId,
        },
        include: {
          payments: true,
        },
      });

    if (!invoice) {
      throw new NotFoundException(
        'Facture introuvable',
      );
    }

    const alreadyPaid =
      invoice.payments
        .filter(
          (payment) =>
            payment.status === PaymentStatus.SUCCESS,
        )
        .reduce(
          (sum, payment) =>
            sum + Number(payment.amount),
          0,
        );

    const invoiceTotal = Number(invoice.total);

    if (
      alreadyPaid + dto.amount >
      invoiceTotal
    ) {
      throw new BadRequestException(
        'Le montant dépasse le solde restant.',
      );
    }

    // `Payment.reference` est unique en base : une référence d'opérateur déjà
    // saisie signale presque toujours un double enregistrement du même
    // versement. Mieux vaut le dire que de laisser remonter une erreur Prisma.
    if (dto.reference?.trim()) {
      const existing = await this.prisma.payment.findUnique({
        where: { reference: dto.reference.trim() },
        select: { id: true },
      });

      if (existing) {
        throw new BadRequestException(
          `La référence « ${dto.reference.trim()} » est déjà enregistrée sur un autre versement.`,
        );
      }
    }

    const count =
      await this.prisma.payment.count();

    return this.prisma.$transaction(
      async (tx) => {
        const payment =
          await tx.payment.create({
            data: {
              // La référence saisie est celle du versement chez l'opérateur
              // — identifiant Wave, numéro de bordereau. Elle prime, parce
              // que c'est elle qui permet de rapprocher avec le relevé. À
              // défaut, on retombe sur une numérotation interne.
              reference:
                dto.reference?.trim() ||
                `PAY-${String(count + 1).padStart(6, '0')}`,

              amount: dto.amount,

              method: dto.method,

              // Trois champs acceptés par le DTO et jamais enregistrés
              // jusqu'ici : un versement daté d'hier était horodaté du jour,
              // et son statut retombait sur la valeur par défaut.
              ...(dto.status ? { status: dto.status } : {}),
              ...(dto.provider ? { provider: dto.provider } : {}),
              paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),

              customer: {
                connect: {
                  id: dto.customerId,
                },
              },

              invoice: {
                connect: {
                  id: dto.invoiceId,
                },
              },

              ...(dto.createdById && {
                createdBy: {
                  connect: {
                    id: dto.createdById,
                  },
                },
              }),
            },
          });

        return payment;
      },
    );
  }

  async validatePayment(id: string) {
    const payment =
      await this.prisma.payment.findUnique({
        where: {
          id,
        },
      });

    if (!payment) {
      throw new NotFoundException(
        'Paiement introuvable',
      );
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const updatedPayment =
          await tx.payment.update({
            where: {
              id,
            },
            data: {
              status:
                PaymentStatus.SUCCESS,
              paidAt: new Date(),
            },
          });

        const invoice =
          await tx.invoice.findUnique({
            where: {
              id: payment.invoiceId,
            },
            include: {
              payments: true,
            },
          });

        const paid =
          invoice!.payments.reduce(
            (sum, p) =>
              p.status === PaymentStatus.SUCCESS ? sum + Number(p.amount) : sum,
            Number(updatedPayment.amount),
          );

        if ( paid >= Number(invoice!.total)) { 
          await tx.invoice.update({
            where: {
              id: invoice!.id,
            },
            data: {
              status:
                InvoiceStatus.PAID,
            },
          });
        }

        return updatedPayment;
      },
    );

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'Payment',
      entityId: id,
      description: `Encaissement ${payment.reference} validé (${payment.amount} XOF)`,
    });

    return result;
  }

  async refund(id: string) {
    return this.prisma.payment.update({
      where: {
        id,
      },
      data: {
        status: PaymentStatus.REFUNDED,
      },
    });
  }

  async cancel(id: string) {
    return this.prisma.payment.update({
      where: {
        id,
      },
      data: {
        status: PaymentStatus.CANCELLED,
      },
    });
  }

  async findAll(params: { page?: number; limit?: number; search?: string; status?: string; customerId?: string } = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 20));

    const where = {
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.search
        ? {
            OR: [
              { reference: { contains: params.search, mode: 'insensitive' as const } },
              { customer: { companyName: { contains: params.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          invoice: true,
          customer: true,
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
        where: {
          id,
        },
        include: {
          invoice: true,
          customer: true,
          createdBy: true,
        },
      });

    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }

    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto) {
    return this.prisma.payment.update({
      where: {
        id,
      },
      data: {
        amount: dto.amount,
        method: dto.method,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.payment.delete({
      where: {
        id,
      },
    });
  }
}
