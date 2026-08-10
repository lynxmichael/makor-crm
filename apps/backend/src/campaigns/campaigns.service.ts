import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PrismaService } from '../prisma/prisma.service';
import { CAMPAIGNS_QUEUE } from '../queue/queue.module';
import {
  SMS_WHATSAPP_GATEWAY,
  SmsWhatsappGateway,
} from '../common/gateway/gateway-adapter.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

import {
  CampaignRecipientStatus,
  CampaignStatus,
  Prisma,
} from '@prisma/client';

import { AddRecipientsDto, CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { WebhookStatusDto } from './dto/webhook-status.dto';

/** Taux d'échec au-delà duquel une campagne est signalée comme anormale
 * (CDC §2.2 "Détection d'anomalies : pic d'échecs, volume anormal"). */
const ANOMALY_FAILURE_RATE_THRESHOLD = 0.2;
const ANOMALY_MIN_SAMPLE = 10;

/** Nombre de destinataires traités en parallèle par lot, pour ne pas
 * saturer la passerelle ni la connexion base de données. */
const SEND_BATCH_SIZE = 25;

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(CAMPAIGNS_QUEUE) private readonly campaignsQueue: Queue,
    @Inject(SMS_WHATSAPP_GATEWAY)
    private readonly gateway: SmsWhatsappGateway,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  private async resolveDestinations(dto: CreateCampaignDto) {
    const destinations = new Set((dto.destinations ?? []).filter(Boolean));

    const customerIds = [
      ...(dto.targetCustomerIds ?? []),
      ...(dto.customerId ? [dto.customerId] : []),
    ];

    if (customerIds.length) {
      const customers = await this.prisma.customer.findMany({
        where: { id: { in: customerIds } },
      });

      for (const customer of customers) {
        const destination =
          dto.type === 'EMAIL' ? customer.email : customer.phone;

        if (destination) destinations.add(destination);
      }
    }

    return [...destinations];
  }

  async create(dto: CreateCampaignDto, createdById?: string) {
    const destinations = await this.resolveDestinations(dto);

    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        subject: dto.subject,
        message: dto.message,
        type: dto.type,
        country: dto.country,

        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,

        ...(dto.productId && {
          product: { connect: { id: dto.productId } },
        }),

        ...(dto.customerId && {
          customer: { connect: { id: dto.customerId } },
        }),

        ...(createdById && {
          createdBy: { connect: { id: createdById } },
        }),

        recipients: destinations.length
          ? { create: destinations.map((destination) => ({ destination })) }
          : undefined,
      },

      include: {
        product: true,
        customer: true,
        createdBy: true,
        _count: { select: { recipients: true } },
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    type?: string;
    customerId?: string;
  }) {
    const { page, limit, search, status, type, customerId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CampaignWhereInput = {
      AND: [
        search ? { name: { contains: search, mode: 'insensitive' } } : {},
        status ? { status: status as CampaignStatus } : {},
        type ? { type: type as Prisma.EnumCampaignTypeFilter['equals'] } : {},
        customerId ? { customerId } : {},
      ],
    };

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: {
          product: true,
          customer: true,
          createdBy: true,
          _count: { select: { recipients: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.campaign.count({ where }),
    ]);

    return {
      data: campaigns,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        product: true,
        customer: true,
        createdBy: true,
        _count: { select: { recipients: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campagne introuvable');
    }

    return campaign;
  }

  async recipients(
    campaignId: string,
    params: { page: number; limit: number; status?: string },
  ) {
    await this.findOne(campaignId);

    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CampaignRecipientWhereInput = {
      campaignId,
      ...(status ? { status: status as CampaignRecipientStatus } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.campaignRecipient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.campaignRecipient.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async addRecipients(campaignId: string, dto: AddRecipientsDto) {
    const campaign = await this.findOne(campaignId);

    if (
      campaign.status !== CampaignStatus.DRAFT &&
      campaign.status !== CampaignStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        "Impossible d'ajouter des destinataires à une campagne déjà en cours ou terminée.",
      );
    }

    const existing = await this.prisma.campaignRecipient.findMany({
      where: { campaignId, destination: { in: dto.destinations } },
      select: { destination: true },
    });

    const existingSet = new Set(existing.map((e) => e.destination));
    const toCreate = [...new Set(dto.destinations)].filter(
      (d) => !existingSet.has(d),
    );

    if (toCreate.length) {
      await this.prisma.campaignRecipient.createMany({
        data: toCreate.map((destination) => ({ campaignId, destination })),
      });
    }

    return this.findOne(campaignId);
  }

  async update(id: string, dto: UpdateCampaignDto) {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(
        'Seule une campagne au statut brouillon peut être modifiée.',
      );
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name,
        subject: dto.subject,
        message: dto.message,
        type: dto.type,
        country: dto.country,

        scheduledAt:
          dto.scheduledAt !== undefined
            ? dto.scheduledAt
              ? new Date(dto.scheduledAt)
              : null
            : undefined,

        ...(dto.productId && { product: { connect: { id: dto.productId } } }),
        ...(dto.customerId && {
          customer: { connect: { id: dto.customerId } },
        }),
      },

      include: { product: true, customer: true, createdBy: true },
    });
  }

  async remove(id: string) {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(
        'Seule une campagne au statut brouillon peut être supprimée — annulez-la sinon.',
      );
    }

    return this.prisma.campaign.delete({ where: { id } });
  }

  async cancel(id: string) {
    const campaign = await this.findOne(id);

    if (
      campaign.status === CampaignStatus.FINISHED ||
      campaign.status === CampaignStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cette campagne ne peut plus être annulée.',
      );
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.CANCELLED },
    });
  }

  /**
   * Programme l'envoi technique de la campagne (CDC §4.7, §2.2) : envoi
   * immédiat ou différé selon `scheduledAt`, traité de façon asynchrone
   * via la file Redis pour ne jamais bloquer la requête HTTP (CDC §8.1).
   */
  async send(id: string) {
    const campaign = await this.findOne(id);

    if (
      campaign.status !== CampaignStatus.DRAFT &&
      campaign.status !== CampaignStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        "Cette campagne a déjà été envoyée ou est en cours d'envoi.",
      );
    }

    if (campaign._count.recipients === 0) {
      throw new BadRequestException(
        "Impossible d'envoyer une campagne sans destinataire.",
      );
    }

    const delay = campaign.scheduledAt
      ? Math.max(0, campaign.scheduledAt.getTime() - Date.now())
      : 0;

    await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.QUEUED },
    });

    await this.campaignsQueue.add(
      'send-campaign',
      { campaignId: id },
      {
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );

    return this.findOne(id);
  }

  /**
   * Traitement effectif d'une campagne — appelé par le worker BullMQ
   * (`CampaignsProcessor`). Envoie chaque destinataire PENDING via la
   * passerelle SMS/WhatsApp, calcule le taux de délivrabilité et
   * détecte les anomalies (CDC §2.2, §9).
   */
  async processCampaign(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { customer: true },
    });

    if (!campaign) return;

    if (campaign.status === CampaignStatus.CANCELLED) {
      this.logger.log(`Campagne ${campaignId} annulée — envoi ignoré.`);
      return;
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.RUNNING, startedAt: new Date() },
    });

    let cursor: string | undefined;

    for (;;) {
      const batch = await this.prisma.campaignRecipient.findMany({
        where: { campaignId, status: CampaignRecipientStatus.PENDING },
        take: SEND_BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      });

      if (batch.length === 0) break;

      await Promise.all(
        batch.map((recipient) => this.sendToRecipient(campaign, recipient)),
      );

      cursor = batch[batch.length - 1].id;

      if (batch.length < SEND_BATCH_SIZE) break;
    }

    await this.finalizeCampaign(campaignId);
  }

  private async sendToRecipient(
    campaign: {
      id: string;
      message: string;
      type: any;
      customerId: string | null;
    },
    recipient: { id: string; destination: string },
  ) {
    try {
      const result = await this.gateway.send({
        destination: recipient.destination,
        message: campaign.message,
        type: campaign.type,
      });

      await this.prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: result.accepted
            ? CampaignRecipientStatus.SENT
            : CampaignRecipientStatus.FAILED,
          providerMessageId: result.providerMessageId,
          errorCode: result.errorCode,
          cost: result.cost,
          sentAt: new Date(),
        },
      });

      if (result.accepted && result.cost && campaign.customerId) {
        await this.prisma.customer
          .update({
            where: { id: campaign.customerId },
            data: { walletBalance: { decrement: result.cost } },
          })
          // Le suivi du solde est secondaire : une erreur ici ne doit
          // jamais faire échouer l'envoi de la campagne.
          .catch((err) =>
            this.logger.warn(
              `Décrément du solde client impossible : ${err.message}`,
            ),
          );
      }
    } catch (error) {
      await this.prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: CampaignRecipientStatus.FAILED,
          errorCode: 'GATEWAY_ERROR',
          sentAt: new Date(),
        },
      });

      this.logger.error(
        `Échec d'envoi vers ${recipient.destination} : ${(error as Error).message}`,
      );
    }
  }

  private async finalizeCampaign(campaignId: string) {
    const stats = await this.stats(campaignId);

    const anomaly =
      stats.processed >= ANOMALY_MIN_SAMPLE &&
      stats.failureRate >= ANOMALY_FAILURE_RATE_THRESHOLD;

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.FINISHED,
        finishedAt: new Date(),
        ...(anomaly && {
          anomalyDetectedAt: new Date(),
          anomalyReason: `Taux d'échec de ${(stats.failureRate * 100).toFixed(1)}% sur ${stats.processed} destinataires traités.`,
        }),
      },
    });

    this.events.emit('campaign.updated', { campaignId, stats });

    if (anomaly) {
      await this.alertAnomaly(campaignId, stats);
    }
  }

  private async alertAnomaly(
    campaignId: string,
    stats: Awaited<ReturnType<CampaignsService['stats']>>,
  ) {
    this.events.emit('campaign.anomaly', { campaignId, stats });

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'Campaign',
      entityId: campaignId,
      description: `Anomalie détectée : ${stats.failureRate * 100}% d'échecs`,
    });

    const admins = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { name: { in: ['SUPER_ADMIN', 'ADMIN_VENTES'] } },
      },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        this.notificationsService.notify(
          admin.id,
          'Anomalie de campagne détectée',
          `La campagne ${campaignId} affiche un taux d'échec anormal (${Math.round(
            stats.failureRate * 100,
          )}%).`,
          { type: 'WARNING' },
        ),
      ),
    );
  }

  /** Taux de délivrabilité et volumes (CDC §2.2, §9). */
  async stats(campaignId: string) {
    const grouped = await this.prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { _all: true },
    });

    const counts: Record<string, number> = {
      PENDING: 0,
      SENT: 0,
      DELIVERED: 0,
      FAILED: 0,
      REJECTED: 0,
    };

    for (const row of grouped) {
      counts[row.status] = row._count._all;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const processed = total - counts.PENDING;
    const failed = counts.FAILED + counts.REJECTED;
    const delivered = counts.DELIVERED + counts.SENT;

    return {
      total,
      processed,
      counts,
      deliveryRate: processed ? delivered / processed : 0,
      failureRate: processed ? failed / processed : 0,
    };
  }

  /**
   * Webhook de statut de livraison exposé aux passerelles SMS/WhatsApp
   * (CDC §2.2). Rapproche le message via `providerMessageId`.
   */
  async handleWebhookStatus(dto: WebhookStatusDto) {
    const recipient = await this.prisma.campaignRecipient.findFirst({
      where: { providerMessageId: dto.providerMessageId },
    });

    if (!recipient) {
      throw new NotFoundException(
        `Aucun destinataire pour providerMessageId=${dto.providerMessageId}`,
      );
    }

    const updated = await this.prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: dto.status,
        errorCode: dto.errorCode,
        deliveredAt: dto.status === 'DELIVERED' ? new Date() : undefined,
      },
    });

    const stats = await this.stats(recipient.campaignId);
    this.events.emit('campaign.updated', {
      campaignId: recipient.campaignId,
      stats,
    });

    if (
      stats.processed >= ANOMALY_MIN_SAMPLE &&
      stats.failureRate >= ANOMALY_FAILURE_RATE_THRESHOLD
    ) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: recipient.campaignId },
      });

      if (campaign && !campaign.anomalyDetectedAt) {
        await this.prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            anomalyDetectedAt: new Date(),
            anomalyReason: `Taux d'échec de ${(stats.failureRate * 100).toFixed(1)}% détecté via webhook.`,
          },
        });

        await this.alertAnomaly(campaign.id, stats);
      }
    }

    return updated;
  }
}
