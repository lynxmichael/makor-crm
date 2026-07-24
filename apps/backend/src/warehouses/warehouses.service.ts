import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

async create(dto: CreateWarehouseDto) {
  const exists = await this.prisma.warehouse.findUnique({
    where: {
      code: dto.code,
    },
  });
  if (exists) {throw new ConflictException('Ce code entrepôt existe déjà.'); 

  } 

  return this.prisma.warehouse.create({
    data: dto,
  });
}

async findAll(query: QueryWarehouseDto) {
  const {
    page,
    limit,
    search,
    isActive,
  } = query;

  const where: Prisma.WarehouseWhereInput = {
    isActive,

    ...(search && {
      OR: [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          code: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ],
    }),
  };

  const [data, total] =
    await this.prisma.$transaction([
      this.prisma.warehouse.findMany({
        where,

        skip: (page - 1) * limit,

        take: limit,

        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.warehouse.count({
        where,
      }),
    ]);

  return {
    data,

    total,

    page,

    limit,

    totalPages: Math.ceil( total / limit),
};
}

async findOne(id: string) {
  const warehouse =
    await this.prisma.warehouse.findUnique({
      where: {
        id,
      },
    });

  if (!warehouse) {
    throw new NotFoundException(
      'Entrepôt introuvable.',
    );
  }

  return warehouse;
}
async update(
  id: string,
  dto: UpdateWarehouseDto,
) {
  await this.findOne(id);

  if (dto.code) {
    const exists =
      await this.prisma.warehouse.findFirst({
        where: {
          code: dto.code,
          NOT: {
            id,
          },
        },
      });

    if (exists) {
      throw new ConflictException(
        'Ce code est déjà utilisé.',
      );
    }
  }

  return this.prisma.warehouse.update({
    where: {
      id,
    },
    data: dto,
  });
}
async remove(id: string) {
  await this.findOne(id);

  return this.prisma.warehouse.update({
    where: {
      id,
    },
    data: {
      isActive: false,
    },
  });
}

async dashboard() {
  const [
    totalWarehouses,
    activeWarehouses,
    inactiveWarehouses,
  ] = await this.prisma.$transaction([
    this.prisma.warehouse.count(),
    this.prisma.warehouse.count({
      where: {
        isActive: true,
      },
    }),
    this.prisma.warehouse.count({
      where: {
        isActive: false,
      },
    }),
  ]);

  return {
    totalWarehouses,
    activeWarehouses,
    inactiveWarehouses,
  };
}
}
