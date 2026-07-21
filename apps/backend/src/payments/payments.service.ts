import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

create(dto: CreatePaymentDto) {
    const { subscriptionId, paidAt, ...data } = dto;

    return this.prisma.payment.create({
      data: {
        ...data,

        paidAt: paidAt ? new Date(paidAt) : null,

        subscription: {
          connect: {
            id: subscriptionId,
          },
        },
      },

      include: {
        subscription: true,
      },
    });
  }

findAll() {
    return this.prisma.payment.findMany({
      include: {
        subscription: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const payment =
      await this.prisma.payment.findUnique({
        where: {
          id,
        },

        include: {
          subscription: true,
        },
      });

    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }

    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto) {
    await this.findOne(id);

    const { subscriptionId, paidAt, ...data } = dto;

    return this.prisma.payment.update({
      where: {
        id,
      },

      data: {
        ...data,

        paidAt:
          paidAt !== undefined ? paidAt ? new Date(paidAt) : null : undefined, ...(subscriptionId && {
 subscription: {
            connect: {
              id: subscriptionId,
            },
          },
        }),
      },

      include: {
        subscription: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.payment.delete({
      where: {
        id,
      },
    });
  }
}
