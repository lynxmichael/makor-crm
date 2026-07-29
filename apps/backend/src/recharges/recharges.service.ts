import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { Prisma } from '@prisma/client';

import { CreateRechargeDto } from './dto/create-recharge.dto';
import { UpdateRechargeDto } from './dto/update-recharge.dto';

@Injectable()
export class RechargesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Enregistre un rechargement et crédite immédiatement le solde
   * prépayé du client (transaction atomique). */
  async create(dto: CreateRechargeDto, recordedById?: string) {
    return this.prisma.$transaction(async (tx) => {
      const recharge = await tx.recharge.create({
        data: {
          amount: dto.amount,
          date: dto.date ? new Date(dto.date) : new Date(),

          customer: { connect: { id: dto.customerId } },

          ...(dto.productId && {
            product: { connect: { id: dto.productId } },
          }),

          ...(recordedById && {
            recordedBy: { connect: { id: recordedById } },
          }),
        },

        include: { customer: true, product: true, recordedBy: true },
      });

      await tx.customer.update({
        where: { id: dto.customerId },
        data: { walletBalance: { increment: dto.amount } },
      });

      return recharge;
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    customerId?: string;
    from?: string;
    to?: string;
  }) {
    const { page, limit, customerId, from, to } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.RechargeWhereInput = {
      customerId,
      date:
        from || to
          ? {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(to) : undefined,
            }
          : undefined,
    };

    const [data, total, sumResult] = await Promise.all([
      this.prisma.recharge.findMany({
        where,
        include: { customer: true, product: true, recordedBy: true },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),

      this.prisma.recharge.count({ where }),

      this.prisma.recharge.aggregate({ where, _sum: { amount: true } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalAmount: Number(sumResult._sum.amount ?? 0),
      },
    };
  }

  async findOne(id: string) {
    const recharge = await this.prisma.recharge.findUnique({
      where: { id },
      include: { customer: true, product: true, recordedBy: true },
    });

    if (!recharge) {
      throw new NotFoundException('Rechargement introuvable');
    }

    return recharge;
  }

  async update(id: string, dto: UpdateRechargeDto) {
    const existing = await this.findOne(id);

    // Si le montant change, on répercute la différence sur le solde
    // pour que le solde prépayé reste toujours exact.
    if (dto.amount !== undefined && dto.amount !== Number(existing.amount)) {
      const delta = dto.amount - Number(existing.amount);

      await this.prisma.customer.update({
        where: { id: existing.customerId },
        data: { walletBalance: { increment: delta } },
      });
    }

    return this.prisma.recharge.update({
      where: { id },
      data: {
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : undefined,

        ...(dto.productId !== undefined && {
          product: dto.productId
            ? { connect: { id: dto.productId } }
            : { disconnect: true },
        }),
      },

      include: { customer: true, product: true, recordedBy: true },
    });
  }

  async remove(id: string) {
    const recharge = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: recharge.customerId },
        data: { walletBalance: { decrement: recharge.amount } },
      });

      return tx.recharge.delete({ where: { id } });
    });
  }

  /** Solde prépayé courant d'un client (cf. reporting "Soldes
   * prépayés"). */
  async balance(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyName: true, walletBalance: true },
    });

    if (!customer) {
      throw new NotFoundException('Client introuvable');
    }

    return {
      customerId: customer.id,
      companyName: customer.companyName,
      walletBalance: Number(customer.walletBalance),
    };
  }
}
