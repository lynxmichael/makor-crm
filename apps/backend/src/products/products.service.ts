import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}
async create(dto: CreateProductDto) {
   const { companyId, ...data } = dto;

  return this.prisma.product.create({
    data: {
      ...data,
      company: {
        connect: {
          id: companyId,
        },
      },
    },
    include: {
      company: true,
    },
  });
}
  findAll() {
    return this.prisma.product.findMany({
      include: {
        company: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        company: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }

    return product;
  }

async update(id: string, dto: UpdateProductDto) {
  await this.findOne(id);

  const { companyId, ...data } = dto;

  return this.prisma.product.update({
    where: {
      id,
    },
    data: {
      ...data,

      ...(companyId
        ? {
            company: {
              connect: {
                id: companyId,
              },
            },
          }
        : {}),
    },
    include: {
      company: true,
    },
  });
}

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.product.delete({
      where: {
        id,
      },
    });
  }
}
