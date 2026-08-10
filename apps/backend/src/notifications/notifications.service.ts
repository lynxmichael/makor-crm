import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { EventEmitter2 } from '@nestjs/event-emitter';

import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  SMS_WHATSAPP_GATEWAY,
  SmsWhatsappGateway,
} from '../common/gateway/gateway-adapter.interface';

import { NotificationChannel } from '@prisma/client';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

/**
 * Notifications multi-canal (CDC §4.14) : email, SMS, WhatsApp, en plus
 * de l'in-app. La notification est toujours créée en base (historique,
 * badge "non lu") ; le canal choisi déclenche en plus un envoi effectif.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    @Inject(SMS_WHATSAPP_GATEWAY)
    private readonly gateway: SmsWhatsappGateway,
    private readonly events: EventEmitter2,
  ) {}

  async create(dto: CreateNotificationDto) {
    const channel = dto.channel ?? NotificationChannel.IN_APP;

    const notification = await this.prisma.notification.create({
      data: {
        title: dto.title,
        message: dto.message,
        type: dto.type,
        channel,

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

    if (channel === NotificationChannel.IN_APP) {
      this.events.emit('notification.created', notification);
      return notification;
    }

    try {
      await this.dispatch(channel, notification);

      const sent = await this.prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date() },
        include: { user: true },
      });

      this.events.emit('notification.created', sent);
      return sent;
    } catch (error) {
      // Un échec d'envoi externe ne doit pas faire perdre la notification
      // in-app déjà enregistrée : on journalise et on la laisse non
      // marquée comme envoyée.
      this.logger.warn(
        `Échec d'envoi de la notification ${notification.id} sur le canal ${channel} : ${
          (error as Error).message
        }`,
      );

      return notification;
    }
  }

  private async dispatch(
    channel: NotificationChannel,
    notification: {
      title: string;
      message: string;
      user: { email: string; phone: string | null };
    },
  ) {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return this.mailService.sendMail(
          notification.user.email,
          notification.title,
          `<p>${notification.message}</p>`,
        );

      case NotificationChannel.SMS:
      case NotificationChannel.WHATSAPP:
        if (!notification.user.phone) {
          throw new Error('Utilisateur sans numéro de téléphone');
        }

        return this.gateway.send({
          destination: notification.user.phone,
          message: `${notification.title} — ${notification.message}`,
          type: channel === NotificationChannel.SMS ? 'SMS' : 'WHATSAPP',
        });

      default:
        return undefined;
    }
  }

  /** Raccourci utilisé par les autres modules (campagnes, pipeline...)
   * pour alerter un utilisateur sans reconstruire un DTO complet. */
  notify(
    userId: string,
    title: string,
    message: string,
    options?: {
      type?: CreateNotificationDto['type'];
      channel?: NotificationChannel;
    },
  ) {
    return this.create({
      userId,
      title,
      message,
      type: options?.type,
      channel: options?.channel,
    });
  }

  findAll(userId?: string) {
    return this.prisma.notification.findMany({
      where: userId ? { userId } : undefined,

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
      include: { user: true },
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

  async markAsRead(id: string) {
    await this.findOne(id);

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
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
