import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        title: dto.title,
        message: dto.message,
        type: dto.type,

        user: {
          connect: {
            id: dto.userId,
          },
        },
      },

      include: {
        user: true,
      },
    });
  }

  findAll() {
    return this.prisma.notification.findMany({
      include: {
        user: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const notification = await this.prisma.notification.findUnique({
        where: { id },
        include: {user: true },
      });

    if (!notification) {
      throw new NotFoundException('Notification introuvable');
    }

    return notification;
  }

  async update(id: string, dto: UpdateNotificationDto) {
    await this.findOne(id);

    return this.prisma.notification.update({
      where: {
        id,
      },

      data: {
        title: dto.title,
        message: dto.message,
        type: dto.type,

        user: dto.userId
          ? {
              connect: {
                id: dto.userId,
              },
            }
          : undefined,
      },

      include: {
        user: true,
      },
    });
  }

   markAsRead(id: string) {
    return this.prisma.notification.update({
      where: {
        id,
      },

      data: {
        isRead: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.notification.delete({
      where: {
        id,
      },
    });
  }
}
