import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { Prisma } from '@prisma/client';

import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuoteDto) {
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

    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    const count = await this.prisma.quote.count();

    return this.prisma.quote.create({
      data: {
        number: `DEV-${String(count + 1).padStart(6, '0')}`,

        title: dto.title,
        notes: dto.notes,

        subtotal,
        discount,
        tax,
        total,

        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,

        status: dto.status,

        customer: {
          connect: {
            id: dto.customerId,
          },
        },

        createdBy: {
          connect: {
            id: dto.createdById,
          },
        },

        ...(dto.dealId && {
          deal: {
            connect: {
              id: dto.dealId,
            },
          },
        }),

        items: {
          create: items,
        },
      },

      include: {
        customer: true,
        deal: true,
        createdBy: true,
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
  }) {
    const { page, limit, search, status } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.QuoteWhereInput = {
      AND: [
        search
          ? {
              OR: [
                {
                  number: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  title: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {},

        status
          ? {
              status: status as any,
            }
          : {},
      ],
    };

    const [quotes, total] = await Promise.all([
        this.prisma.quote.findMany({
          where,

          include: {
            customer: true,
            deal: true,
            createdBy: true,
            items: true,
          },

          skip,
          take: limit,

          orderBy: {
            createdAt: 'desc',
          },
        }),

        this.prisma.quote.count({
          where,
        }),
      ]);

    return {
      data: quotes,

      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
        where: {
          id,
        },

        include: {
          customer: true,
          deal: true,
          createdBy: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

    if (!quote) {
      throw new NotFoundException('Devis introuvable');
    }

    return quote;
  }

  async update(id: string, dto: UpdateQuoteDto) {
    await this.findOne(id);

    return this.prisma.quote.update({
      where: {
        id,
      },

      data: {
        title: dto.title,
        notes: dto.notes,

        status: dto.status,

        validUntil:
          dto.validUntil !== undefined
            ? dto.validUntil
              ? new Date(dto.validUntil)
              : null
            : undefined,
      },

      include: {
        customer: true,
        deal: true,
        createdBy: true,
        items: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.quote.delete({
      where: {
        id,
      },
    });
  }
}
