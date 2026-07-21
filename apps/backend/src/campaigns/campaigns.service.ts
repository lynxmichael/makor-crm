import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateCampaignDto) {
    const { companyId, scheduledAt, ...data } = dto;

    return this.prisma.campaign.create({
      data: {
        ...data,

        scheduledAt: scheduledAt
          ? new Date(scheduledAt)
          : null,

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

  async findAll() {
    return this.prisma.campaign.findMany({
      include: {
        company: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const campaign =
      await this.prisma.campaign.findUnique({
        where: { id },
        include: {
          company: true,
        },
      });

    if (!campaign) {
      throw new NotFoundException(
        'Campagne introuvable',
      );
    }

    return campaign;
  }

  async update(
    id: string,
    dto: UpdateCampaignDto,
  ) {
    await this.findOne(id);

    const {
      companyId,
      scheduledAt,
      ...data
    } = dto;

    return this.prisma.campaign.update({
      where: { id },

      data: {
        ...data,

        scheduledAt:
          scheduledAt !== undefined
            ? scheduledAt
              ? new Date(scheduledAt)
              : null
            : undefined,

        ...(companyId && {
          company: {
            connect: {
              id: companyId,
            },
          },
        }),
      },

      include: {
        company: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.campaign.delete({
      where: { id },
    });
  }
}
