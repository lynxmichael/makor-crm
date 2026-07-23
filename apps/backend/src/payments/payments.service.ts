import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { PaymentStatus, InvoiceStatus } from '@prisma/client';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
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

    const count =
      await this.prisma.payment.count();

    return this.prisma.$transaction(
      async (tx) => {
        const payment =
          await tx.payment.create({
            data: {
              reference: `PAY-${String(
                count + 1,
              ).padStart(6, '0')}`,

              amount: dto.amount,

              method: dto.method,

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

    return this.prisma.$transaction(
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

  async findAll() {
    return this.prisma.payment.findMany({
      include: {
        invoice: true,
        customer: true,
        createdBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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
