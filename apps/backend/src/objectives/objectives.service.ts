import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { Prisma } from '@prisma/client';

import { CreateObjectiveDto } from './dto/create-objective.dto';
import { UpdateObjectiveDto } from './dto/update-objective.dto';

@Injectable()
export class ObjectivesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateObjectiveDto, createdById: string) {
    return this.prisma.objective.create({
      data: {
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        targetAmount: dto.targetAmount,
        targetDeals: dto.targetDeals,

        user: { connect: { id: dto.userId } },
        createdBy: { connect: { id: createdById } },
      },

      include: { user: true, createdBy: true },
    });
  }

  async findAll(params: { userId?: string; from?: string; to?: string }) {
    const { userId, from, to } = params;

    const where: Prisma.ObjectiveWhereInput = {
      userId,
      ...(from || to
        ? {
            periodStart: from ? { gte: new Date(from) } : undefined,
            periodEnd: to ? { lte: new Date(to) } : undefined,
          }
        : {}),
    };

    return this.prisma.objective.findMany({
      where,
      include: { user: true, createdBy: true },
      orderBy: { periodStart: 'desc' },
    });
  }

  async findOne(id: string) {
    const objective = await this.prisma.objective.findUnique({
      where: { id },
      include: { user: true, createdBy: true },
    });

    if (!objective) {
      throw new NotFoundException('Objectif introuvable');
    }

    return objective;
  }

  async update(id: string, dto: UpdateObjectiveDto) {
    await this.findOne(id);

    return this.prisma.objective.update({
      where: { id },
      data: {
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
        targetAmount: dto.targetAmount,
        targetDeals: dto.targetDeals,
      },

      include: { user: true, createdBy: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.objective.delete({ where: { id } });
  }

  /** Avancement réel vs objectif (CA gagné, nombre de deals gagnés). */
  async progress(id: string) {
    const objective = await this.findOne(id);

    const [amountResult, dealsWon] = await Promise.all([
      this.prisma.deal.aggregate({
        where: {
          assignedToId: objective.userId,
          stage: { isClosedWon: true },
          updatedAt: { gte: objective.periodStart, lte: objective.periodEnd },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),

      this.prisma.deal.count({
        where: {
          assignedToId: objective.userId,
          stage: { isClosedWon: true },
          updatedAt: { gte: objective.periodStart, lte: objective.periodEnd },
        },
      }),
    ]);

    const achievedAmount = Number(amountResult._sum?.amount ?? 0);
    const targetAmount = Number(objective.targetAmount);

    return {
      objective,
      achievedAmount,
      achievedDeals: dealsWon,
      amountProgress: targetAmount ? achievedAmount / targetAmount : 0,
      dealsProgress: objective.targetDeals
        ? dealsWon / objective.targetDeals
        : null,
    };
  }
}
