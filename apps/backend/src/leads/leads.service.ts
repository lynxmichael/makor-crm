import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { Prisma } from '@prisma/client';

import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateLeadDto) {
    return this.prisma.lead.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        email: dto.email,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        value: dto.value,
        notes: dto.notes,

        source: dto.source,
        status: dto.status,

        ...(dto.assignedToId && {
          assignedTo: {
            connect: {
              id: dto.assignedToId,
            },
          },
        }),

        ...(dto.companyId && {
          companyEntity: {
            connect: {
              id: dto.companyId,
            },
          },
        }),
      },

      include: {
        assignedTo: true,
        companyEntity: true,
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    source?: string;
    assignedToId?: string;
    companyId?: string;
  }) {
    const { page, limit, search, status, source, assignedToId, companyId } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = {
      AND: [
        search
          ? {
              OR: [
                {
                  firstName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  phone: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  company: {
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

        source
          ? {
              source: source as any,
            }
          : {},

        assignedToId
          ? {
              assignedToId,
            }
          : {},

        companyId
          ? {
              companyId,
            }
          : {},
      ],
    };

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,

        include: {
          assignedTo: true,
          companyEntity: true,
        },

        skip,
        take: limit,

        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.lead.count({
        where,
      }),
    ]);

    return {
      data: leads,

      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: {
        id,
      },

      include: {
        assignedTo: true,
        companyEntity: true,
      },
    });

    if (!lead) {
      throw new NotFoundException('Prospect introuvable');
    }

    return lead;
  }

  async update(id: string, dto: UpdateLeadDto) {
    await this.findOne(id);

    return this.prisma.lead.update({
      where: {
        id,
      },

      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        email: dto.email,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        value: dto.value,
        notes: dto.notes,
        status: dto.status,
        source: dto.source,

        ...(dto.assignedToId && {
          assignedTo: {
            connect: {
              id: dto.assignedToId,
            },
          },
        }),

        ...(dto.companyId && {
          companyEntity: {
            connect: {
              id: dto.companyId,
            },
          },
        }),
      },

      include: {
        assignedTo: true,
        companyEntity: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.lead.delete({
      where: {
        id,
      },
    });
  }
}
