import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateInvoiceDto) {
    const { customerId, subscriptionId, paymentId, dueDate, ...data } = dto;

    return this.prisma.invoice.create({
      data: {
        ...data,

        dueDate: dueDate ? new Date(dueDate) : null,

        customer: {
          connect: {
            id: customerId,
          },
        },

        ...(subscriptionId && {
          subscription: {
            connect: {
              id: subscriptionId,
            },
          },
        }),

        ...(paymentId && {
          payment: {
            connect: {
              id: paymentId,
            },
          },
        }),
      },

      include: {
        customer: true,
        subscription: true,
        payment: true,
      },
    });
  }

  findAll() {
    return this.prisma.invoice.findMany({
      include: {
        customer: true,
        subscription: true,
        payment: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
 where: {
          id,
        },

        include: {
          customer: true,
          subscription: true,
          payment: true,
        },
      });

    if (!invoice) {
      throw new NotFoundException('Facture introuvable');
    }

    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    await this.findOne(id);

    const { customerId, subscriptionId, paymentId, dueDate, ...data } = dto;

    return this.prisma.invoice.update({
      where: {
        id,
      },

      data: {
        ...data,

        dueDate:
          dueDate !== undefined
            ? dueDate
              ? new Date(dueDate)
              : null
            : undefined,

        ...(customerId && {
          customer: {
            connect: {
              id: customerId,
            },
          },
        }),

        ...(subscriptionId && {
          subscription: {
            connect: {
              id: subscriptionId,
            },
          },
        }),

        ...(paymentId && {
          payment: {
            connect: {
              id: paymentId,
            },
          },
        }),
      },

      include: {
        customer: true,
        subscription: true,
        payment: true,
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
}
