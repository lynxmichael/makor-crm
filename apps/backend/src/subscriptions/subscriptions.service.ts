import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

   create(dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({
      data: {
        startDate: new Date(dto.startDate), endDate: dto.endDate ? new Date(dto.endDate) : null,
          status: dto.status,
           customer: {
          connect: {
            id: dto.customerId,
          },
        },

        offer: {
          connect: {
            id: dto.offerId,
          },
        },
      },

      include: {
        customer: true,
        offer: true,
      },
    });
  }

findAll() {
    return this.prisma.subscription.findMany({
      include: {
        customer: true,
        offer: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const subscription =
      await this.prisma.subscription.findUnique({
        where: {
          id,
        },

        include: {
          customer: true,
          offer: true,
        },
      });

    if (!subscription) {
      throw new NotFoundException('Souscription introuvable');
    }

    return subscription;
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    await this.findOne(id);

    return this.prisma.subscription.update({
      where: {
        id,
      },

      data: {
        startDate: dto.startDate
          ? new Date(dto.startDate)
          : undefined,

        endDate:
          dto.endDate !== undefined
            ? dto.endDate
              ? new Date(dto.endDate)
              : null
            : undefined,

        status: dto.status,

        customer: dto.customerId
          ? {
              connect: {
                id: dto.customerId,
              },
            }
          : undefined,

        offer: dto.offerId
          ? {
              connect: {
                id: dto.offerId,
              },
            }
          : undefined,
      },

      include: {
        customer: true,
        offer: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.subscription.delete({
      where: {
        id,
      },
    });
  }
}
