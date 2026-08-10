import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

import { Prisma, SenderIdStatus } from '@prisma/client';

import { CreateSenderIdRequestDto } from './dto/create-sender-id.dto';
import { UpdateSenderIdRequestDto } from './dto/update-sender-id.dto';
import { RejectSenderIdDto } from './dto/reject-sender-id.dto';

/** Gestion des demandes d'identifiant expéditeur SMS (CDC §4.11) :
 * soumission par le commercial, validation par le Super Admin / Admin
 * ventes, notification du résultat au demandeur et au client. */
@Injectable()
export class SenderIdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  create(dto: CreateSenderIdRequestDto, requestedById: string) {
    return this.prisma.senderIdRequest.create({
      data: {
        name: dto.name.toUpperCase(),
        partner: dto.partner,
        notes: dto.notes,

        customer: { connect: { id: dto.customerId } },
        requestedBy: { connect: { id: requestedById } },
      },

      include: { customer: true, requestedBy: true },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    status?: string;
    customerId?: string;
  }) {
    const { page, limit, status, customerId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.SenderIdRequestWhereInput = {
      status: status as SenderIdStatus,
      customerId,
    };

    const [data, total] = await Promise.all([
      this.prisma.senderIdRequest.findMany({
        where,
        include: { customer: true, requestedBy: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.senderIdRequest.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const request = await this.prisma.senderIdRequest.findUnique({
      where: { id },
      include: { customer: true, requestedBy: true },
    });

    if (!request) {
      throw new NotFoundException('Demande de Sender ID introuvable');
    }

    return request;
  }

  async update(id: string, dto: UpdateSenderIdRequestDto) {
    const request = await this.findOne(id);

    if (request.status !== SenderIdStatus.PENDING) {
      throw new BadRequestException(
        'Seule une demande en attente peut être modifiée.',
      );
    }

    return this.prisma.senderIdRequest.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.toUpperCase() : undefined,
        partner: dto.partner,
        notes: dto.notes,
      },

      include: { customer: true, requestedBy: true },
    });
  }

  async approve(id: string) {
    const request = await this.findOne(id);

    if (request.status !== SenderIdStatus.PENDING) {
      throw new BadRequestException('Cette demande a déjà été traitée.');
    }

    const updated = await this.prisma.senderIdRequest.update({
      where: { id },
      data: { status: SenderIdStatus.APPROVED, approvedAt: new Date() },
      include: { customer: true, requestedBy: true },
    });

    await this.notifyOutcome(updated, 'Approuvé');

    return updated;
  }

  async reject(id: string, dto: RejectSenderIdDto) {
    const request = await this.findOne(id);

    if (request.status !== SenderIdStatus.PENDING) {
      throw new BadRequestException('Cette demande a déjà été traitée.');
    }

    const updated = await this.prisma.senderIdRequest.update({
      where: { id },
      data: {
        status: SenderIdStatus.REJECTED,
        notes: [request.notes, `Motif de rejet : ${dto.reason}`]
          .filter(Boolean)
          .join('\n'),
      },
      include: { customer: true, requestedBy: true },
    });

    await this.notifyOutcome(updated, 'Rejeté');

    return updated;
  }

  private async notifyOutcome(
    request: {
      name: string;
      status: SenderIdStatus;
      requestedBy: { id: string; email: string };
    },
    label: string,
  ) {
    await Promise.all([
      this.mailService
        .sendSenderIdStatusUpdate(
          request.requestedBy.email,
          request.name,
          label,
        )
        .catch(() => undefined),

      this.notificationsService.notify(
        request.requestedBy.id,
        `Sender ID "${request.name}" — ${label}`,
        `Votre demande d'identifiant expéditeur a été ${label.toLowerCase()}.`,
        {
          type:
            request.status === SenderIdStatus.APPROVED ? 'SUCCESS' : 'ERROR',
        },
      ),
    ]);
  }

  async remove(id: string) {
    const request = await this.findOne(id);

    if (request.status !== SenderIdStatus.PENDING) {
      throw new BadRequestException(
        'Seule une demande en attente peut être supprimée.',
      );
    }

    return this.prisma.senderIdRequest.delete({ where: { id } });
  }
}
