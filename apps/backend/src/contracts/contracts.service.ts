import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContractDto) {
    const count = await this.prisma.contract.count();

    return this.prisma.contract.create({
      data: {
        number: `CTR-${String(count + 1).padStart(6, '0')}`,

        title: dto.title,
        description: dto.description,

        amount: dto.amount,

        startDate: new Date(dto.startDate),

        endDate: dto.endDate ? new Date(dto.endDate) : null,

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

        ...(dto.quoteId && {
          quote: {
            connect: {
              id: dto.quoteId,
            },
          },
        }),
      },

      include: {
        customer: true,
        quote: true,
        createdBy: true,
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

    const where: Prisma.ContractWhereInput = {
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

    const [contracts, total] =  await Promise.all([
        this.prisma.contract.findMany({
          where,

          include: {
            customer: true,
            quote: true,
            createdBy: true,
            invoices: true,
          },

          skip,
          take: limit,

          orderBy: {
            createdAt: 'desc',
          },
        }),

        this.prisma.contract.count({
          where,
        }),
      ]);

    return {
      data: contracts,

      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
        where: {
          id,
        },

        include: {
          customer: true,
          quote: true,
          createdBy: true,
          invoices: true,
        },
      });

    if (!contract) {
      throw new NotFoundException('Contrat introuvable');
    }

    return contract;
  }

  async update(id: string, dto: UpdateContractDto) {
    await this.findOne(id);

    return this.prisma.contract.update({
      where: {
        id,
      },

      data: {
        title: dto.title,
        description: dto.description,

        amount: dto.amount,

        status: dto.status,

        startDate: dto.startDate ? new Date(dto.startDate) : undefined,

        endDate:
          dto.endDate !== undefined
            ? dto.endDate
              ? new Date(dto.endDate)
              : null
            : undefined,

        ...(dto.customerId && {
          customer: {
            connect: {
              id: dto.customerId,
            },
          },
        }),

        ...(dto.quoteId && {
          quote: {
            connect: {
              id: dto.quoteId,
            },
          },
        }),
      },

      include: {
        customer: true,
        quote: true,
        createdBy: true,
        invoices: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.contract.delete({
      where: {
        id,
      },
    });
  }

  async activate(id: string) {
    await this.findOne(id);

    return this.prisma.contract.update({
      where: {
        id,
      },

      data: {
        status: 'ACTIVE',
        signedAt: new Date(),
      },
    });
  }

  async suspend(id: string) {
    await this.findOne(id);

    return this.prisma.contract.update({
      where: {
        id,
      },

      data: {
        status: 'SUSPENDED',
      },
    });
  }

  async terminate(id: string) {
    await this.findOne(id);

    return this.prisma.contract.update({
      where: {
        id,
      },

      data: {
        status: 'TERMINATED',
      },
    });
  }
}
