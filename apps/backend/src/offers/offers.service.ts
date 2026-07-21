import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOfferDto) {
    return this.prisma.offer.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        price: dto.price,
        duration: dto.duration,
        isActive: dto.isActive ?? true,

        product: {
          connect: {
            id: dto.productId,
          },
        },
      },
      include: {
        product: true,
      },
    });
  }

  async findAll() {
    return this.prisma.offer.findMany({
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const offer = await this.prisma.offer.findUnique({
      where: {
        id,
      },
      include: {
        product: true,
      },
    });

    if (!offer) {
      throw new NotFoundException('Offre introuvable');
    }

    return offer;
  }

  async update(id: string, dto: UpdateOfferDto) {
    await this.findOne(id);

    return this.prisma.offer.update({
      where: {
        id,
      },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        price: dto.price,
        duration: dto.duration,
        isActive: dto.isActive,

        product: dto.productId
          ? {
              connect: {
                id: dto.productId,
              },
            }
          : undefined,
      },
      include: {
        product: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.offer.delete({
      where: {
        id,
      },
    });
  }
}
