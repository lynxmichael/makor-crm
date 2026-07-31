import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

import { CreateMessageDto } from './dto/create-message.dto';
import { FilterMessageDto } from './dto/filter-message.dto';

const PARTY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatar: true,
  jobTitle: true,
} as const;

interface Attachment {
  path: string;
  name: string;
  size: number;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  // -------------------------------------------------------------------------
  // Lecture
  // -------------------------------------------------------------------------

  /** Boîte de réception : ce que j'ai reçu et pas mis à la corbeille. */
  async inbox(userId: string, filter: FilterMessageDto) {
    const { page, limit, search, unread } = filter;

    const where = {
      recipientId: userId,
      deletedByRecipient: false,
      ...(unread === 'true' ? { readAt: null } : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search, mode: 'insensitive' as const } },
              { body: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: { sender: { select: PARTY_SELECT } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.message.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Messages envoyés. */
  async sent(userId: string, filter: FilterMessageDto) {
    const { page, limit } = filter;

    const where = { senderId: userId, deletedBySender: false };

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: { recipient: { select: PARTY_SELECT } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.message.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Liste des conversations, triée par dernier message.
   *
   * Il n'y a pas de table « conversation » : une conversation est simplement
   * l'ensemble des messages échangés avec une personne. On agrège donc en
   * mémoire à partir des derniers messages, ce qui évite un modèle de plus à
   * maintenir en cohérence. Si le volume devenait un problème, ce serait le
   * premier endroit à passer en requête SQL brute avec un DISTINCT ON.
   */
  async conversations(userId: string, take = 300) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, deletedBySender: false },
          { recipientId: userId, deletedByRecipient: false },
        ],
      },
      include: {
        sender: { select: PARTY_SELECT },
        recipient: { select: PARTY_SELECT },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    const byPartner = new Map<
      string,
      {
        partner: typeof messages[number]['sender'];
        lastMessage: typeof messages[number];
        unreadCount: number;
      }
    >();

    for (const message of messages) {
      const outgoing = message.senderId === userId;
      const partner = outgoing ? message.recipient : message.sender;

      const entry = byPartner.get(partner.id);

      if (!entry) {
        byPartner.set(partner.id, {
          partner,
          lastMessage: message,
          unreadCount: !outgoing && !message.readAt ? 1 : 0,
        });
        continue;
      }

      // `messages` est déjà trié du plus récent au plus ancien : le premier
      // rencontré pour un partenaire est bien le dernier message.
      if (!outgoing && !message.readAt) entry.unreadCount += 1;
    }

    return [...byPartner.values()].sort(
      (a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime(),
    );
  }

  /** Fil complet avec une personne, du plus ancien au plus récent. */
  async thread(userId: string, partnerId: string) {
    const partner = await this.prisma.user.findUnique({
      where: { id: partnerId },
      select: PARTY_SELECT,
    });

    if (!partner) throw new NotFoundException('Ce collègue n’existe pas ou plus.');

    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: partnerId, deletedBySender: false },
          { senderId: partnerId, recipientId: userId, deletedByRecipient: false },
        ],
      },
      include: { sender: { select: PARTY_SELECT } },
      orderBy: { createdAt: 'asc' },
    });

    // Ouvrir un fil vaut lecture : marquer message par message obligerait
    // l'interface à faire un appel par ligne affichée.
    await this.prisma.message.updateMany({
      where: { senderId: partnerId, recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { partner, messages };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: { recipientId: userId, readAt: null, deletedByRecipient: false },
    });
    return { count };
  }

  // -------------------------------------------------------------------------
  // Écriture
  // -------------------------------------------------------------------------

  async send(dto: CreateMessageDto, senderId: string, attachment?: Attachment) {
    if (dto.recipientId === senderId) {
      throw new BadRequestException('Vous ne pouvez pas vous envoyer un message à vous-même.');
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
      select: { ...PARTY_SELECT, isActive: true },
    });

    if (!recipient) throw new NotFoundException('Destinataire introuvable.');
    if (!recipient.isActive) {
      throw new BadRequestException('Ce compte est désactivé et ne peut pas recevoir de message.');
    }

    const message = await this.prisma.message.create({
      data: {
        subject: dto.subject ?? null,
        body: dto.body,
        senderId,
        recipientId: dto.recipientId,
        attachmentPath: attachment?.path ?? null,
        attachmentName: attachment?.name ?? null,
        attachmentSize: attachment?.size ?? null,
      },
      include: {
        sender: { select: PARTY_SELECT },
        recipient: { select: PARTY_SELECT },
      },
    });

    // Temps réel d'abord : le destinataire connecté voit le message arriver
    // sans attendre que le SMTP réponde.
    this.events.emit('message.created', message);

    void this.notifyByEmail(message);

    return message;
  }

  /**
   * Le CDC demande une notification email au destinataire. Un SMTP
   * indisponible ne doit pas faire échouer l'envoi du message : il est déjà
   * en base et visible dans l'application.
   */
  private async notifyByEmail(message: {
    id: string;
    subject: string | null;
    body: string;
    sender: { firstName: string; lastName: string };
    recipient: { email: string; firstName: string };
  }) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? '';
    const author = `${message.sender.firstName} ${message.sender.lastName}`;
    const preview =
      message.body.length > 300 ? `${message.body.slice(0, 300)}…` : message.body;

    try {
      await this.mail.sendMail(
        message.recipient.email,
        message.subject
          ? `[CRM MAKOR] ${message.subject}`
          : `[CRM MAKOR] Nouveau message de ${author}`,
        `<p>Bonjour ${message.recipient.firstName},</p>
         <p><strong>${author}</strong> vous a envoyé un message :</p>
         <blockquote style="border-left:3px solid #0e7c86;margin:0;padding:0 0 0 12px;color:#5b6472">
           ${preview.replace(/\n/g, '<br>')}
         </blockquote>
         <p><a href="${frontendUrl}/messages?thread=${message.id}">Répondre dans le CRM</a></p>`,
      );
    } catch (error) {
      this.logger.warn(
        `Notification email non envoyée pour le message ${message.id} : ${String(error)}`,
      );
    }
  }

  async markAsRead(id: string, userId: string) {
    const message = await this.findOrFail(id);

    if (message.recipientId !== userId) {
      throw new ForbiddenException('Vous ne pouvez marquer comme lu que vos propres messages.');
    }

    return this.prisma.message.update({
      where: { id },
      data: { readAt: message.readAt ?? new Date() },
    });
  }

  /**
   * Suppression par côté : chacun range sa boîte sans effacer la copie de
   * l'autre. Quand les deux ont supprimé, la ligne part pour de bon.
   */
  async remove(id: string, userId: string) {
    const message = await this.findOrFail(id);

    const isSender = message.senderId === userId;
    const isRecipient = message.recipientId === userId;

    if (!isSender && !isRecipient) {
      throw new ForbiddenException('Ce message ne vous appartient pas.');
    }

    const deletedBySender = isSender || message.deletedBySender;
    const deletedByRecipient = isRecipient || message.deletedByRecipient;

    if (deletedBySender && deletedByRecipient) {
      await this.prisma.message.delete({ where: { id } });
      return { id, purged: true };
    }

    await this.prisma.message.update({
      where: { id },
      data: { deletedBySender, deletedByRecipient },
    });

    return { id, purged: false };
  }

  private async findOrFail(id: string) {
    const message = await this.prisma.message.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Message introuvable.');
    return message;
  }
}
