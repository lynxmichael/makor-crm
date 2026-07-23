import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { Prisma } from '@prisma/client';

import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateActivityDto) {
    return this.prisma.activity.create({
      data: {
        title: dto.title,
        description: dto.description,

        type: dto.type,
        status: dto.status,

        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,

        assignedTo: {
          connect: {
            id: dto.assignedToId,
          },
        },

        ...(dto.leadId && {
          lead: {
            connect: {
              id: dto.leadId,
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

        ...(dto.dealId && {
          deal: {
            connect: {
              id: dto.dealId,
            },
          },
        }),
      },

      include: {
        assignedTo: true,
        lead: true,
        customer: true,
        deal: true,
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    type?: string;
    status?: string;
    assignedToId?: string;
    leadId?: string;
    customerId?: string;
    dealId?: string;
  }) {
    const {
      page,
      limit,
      search,
      type,
      status,
      assignedToId,
      leadId,
      customerId,
      dealId,
    } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.ActivityWhereInput = {
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

        type
          ? {
              type: type as any,
            }
          : {},

        status
          ? {
              status: status as any,
            }
          : {},

        assignedToId
          ? {
              assignedToId,
            }
          : {},

        leadId
          ? {
              leadId,
            }
          : {},

        customerId
          ? {
              customerId,
            }
          : {},

        dealId
          ? {
              dealId,
            }
          : {},
      ],
    };

    const [activities, total] =
      await Promise.all([
        this.prisma.activity.findMany({
          where,

          include: {
            assignedTo: true,
            lead: true,
            customer: true,
            deal: true,
          },

          skip,
          take: limit,

          orderBy: {
            dueDate: 'asc',
          },
        }),

        this.prisma.activity.count({
          where,
        }),
      ]);

    return {
      data: activities,

      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const activity =
      await this.prisma.activity.findUnique({
        where: {
          id,
        },

        include: {
          assignedTo: true,
          lead: true,
          customer: true,
          deal: true,
        },
      });

    if (!activity) {
      throw new NotFoundException('Activité introuvable');
    }

    return activity;
  }

  async update(id: string, dto: UpdateActivityDto) {
    await this.findOne(id);

    return this.prisma.activity.update({
      where: {
        id,
      },

      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status: dto.status,

        dueDate:
          dto.dueDate !== undefined
            ? dto.dueDate
              ? new Date(dto.dueDate)
              : null
            : undefined,

        completedAt: dto.status === 'COMPLETED' ? new Date() : undefined,

        ...(dto.assignedToId && {
          assignedTo: {
            connect: {
              id: dto.assignedToId,
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

        ...(dto.customerId && {
          customer: {
            connect: {
              id: dto.customerId,
            },
          },
        }),

        ...(dto.dealId && {
          deal: {
            connect: {
              id: dto.dealId,
            },
          },
        }),
      },

      include: {
        assignedTo: true,
        lead: true,
        customer: true,
        deal: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.activity.delete({
      where: {
        id,
      },
    });
  }
}
