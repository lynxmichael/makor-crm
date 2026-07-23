import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { Prisma } from '@prisma/client';

import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateDealDto) {
    return this.prisma.deal.create({
      data: {
        title: dto.title,
        description: dto.description,

        amount: dto.amount,

        probability: dto.probability ?? 0,

        expectedCloseDate: dto.expectedCloseDate
          ? new Date(dto.expectedCloseDate)
          : null,

        stage: dto.stage,

        assignedTo: {
          connect: {
            id: dto.assignedToId,
          },
        },

        ...(dto.customerId && {
          customer: {
            connect: {
              id: dto.customerId,
            },
          },
        }),

        ...(dto.leadId && {
          lead: {
            connect: {
              id: dto.leadId,
            },
          },
        }),
      },

      include: {
        assignedTo: true,
        customer: true,
        lead: true,
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    stage?: string;
    assignedToId?: string;
    customerId?: string;
    leadId?: string;
  }) {
    const { page, limit, search, stage, assignedToId, customerId, leadId } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.DealWhereInput = {
      AND: [
        search
          ? {
              OR: [
                {
                  title: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  description: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {},

        stage
          ? {
              stage: stage as any,
            }
          : {},

        assignedToId
          ? {
              assignedToId,
            }
          : {},

        customerId
          ? {
              customerId,
            }
          : {},

        leadId
          ? {
              leadId,
            }
          : {},
      ],
    };

    const [deals, total] = await Promise.all([
        this.prisma.deal.findMany({ where, include: { assignedTo: true, customer: true, lead: true }, 
            skip,
          take: limit,

          orderBy: {
            createdAt: 'desc',
          },
        }),

        this.prisma.deal.count({
          where,
        }),
      ]);

    return {
      data: deals,

      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const deal =
      await this.prisma.deal.findUnique({
        where: {
          id,
        },

        include: {
          assignedTo: true,
          customer: true,
          lead: true,
        },
      });

    if (!deal) {
      throw new NotFoundException('Opportunité introuvable');
    }

    return deal;
  }

  async update(id: string, dto: UpdateDealDto) {
    await this.findOne(id);

    return this.prisma.deal.update({
      where: {
        id,
      },

      data: {
        title: dto.title,
        description: dto.description,

        amount: dto.amount,

        probability: dto.probability,

        stage: dto.stage,

        expectedCloseDate:
          dto.expectedCloseDate !== undefined
            ? dto.expectedCloseDate
              ? new Date(dto.expectedCloseDate)
              : null
            : undefined,

        ...(dto.assignedToId && {
          assignedTo: {
            connect: {
              id: dto.assignedToId,
            },
          },
        }),

        ...(dto.customerId && {
          customer: {
            connect: {
              id: dto.customerId,
            },
          },
        }),

        ...(dto.leadId && {
          lead: {
            connect: {
              id: dto.leadId,
            },
          },
        }),
      },

      include: {
        assignedTo: true,
        customer: true,
        lead: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.deal.delete({
      where: {
        id,
      },
    });
  }
}
