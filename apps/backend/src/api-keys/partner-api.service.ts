import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignType, CampaignStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  SMS_WHATSAPP_GATEWAY,
  type SmsWhatsappGateway,
} from '../common/gateway/gateway-adapter.interface';

import { PartnerSendMessageDto } from './dto/send-message.dto';

/** Contexte fourni par `ApiKeyGuard`. */
export interface ApiKeyContext {
  id: string;
  customerId: string;
  senderId: string | null;
}

@Injectable()
export class PartnerApiService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SMS_WHATSAPP_GATEWAY) private readonly gateway: SmsWhatsappGateway,
  ) {}

  /**
   * Envoi transactionnel.
   *
   * Passe par le même modèle `Campaign` que les envois du CRM, avec un nom
   * préfixé « API ». Créer un circuit parallèle aurait produit deux
   * comptages différents du volume acheminé — et donc un reporting client
   * qui ne recoupe pas la facturation.
   */
  async sendMessages(dto: PartnerSendMessageDto, context: ApiKeyContext) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: context.customerId },
      select: { id: true, companyName: true, walletBalance: true, status: true },
    });

    if (!customer) throw new NotFoundException('Client introuvable.');

    if (customer.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Le compte client est suspendu ou inactif : aucun envoi n’est possible.',
      );
    }

    const type = dto.type ?? CampaignType.SMS;

    // Le Sender ID porté par la clé prime sur celui de la requête : c'est
    // l'administrateur qui décide au nom de qui un partenaire émet, pas le
    // partenaire lui-même.
    const senderId = context.senderId ?? dto.senderId;

    const campaign = await this.prisma.campaign.create({
      data: {
        name: `API — ${new Date().toISOString()}`,
        message: dto.message,
        type,
        status: CampaignStatus.RUNNING,
        customerId: customer.id,
        startedAt: new Date(),
        recipients: {
          create: dto.destinations.map((destination) => ({ destination })),
        },
      },
      include: { recipients: true },
    });

    const results = await Promise.all(
      campaign.recipients.map(async (recipient) => {
        try {
          const result = await this.gateway.send({
            destination: recipient.destination,
            message: dto.message,
            type,
            senderId: senderId ?? undefined,
          });

          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: result.accepted ? 'SENT' : 'FAILED',
              providerMessageId: result.providerMessageId,
              errorCode: result.errorCode ?? null,
              sentAt: new Date(),
            },
          });

          return {
            destination: recipient.destination,
            accepted: result.accepted,
            messageId: recipient.id,
            errorCode: result.errorCode,
          };
        } catch {
          await this.prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: { status: 'FAILED', errorCode: 'GATEWAY_ERROR' },
          });

          return {
            destination: recipient.destination,
            accepted: false,
            messageId: recipient.id,
            errorCode: 'GATEWAY_ERROR',
          };
        }
      }),
    );

    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: CampaignStatus.FINISHED, finishedAt: new Date() },
    });

    const accepted = results.filter((r) => r.accepted).length;

    return {
      batchId: campaign.id,
      accepted,
      rejected: results.length - accepted,
      results,
    };
  }

  /** Statut de livraison d'un message, tel que remonté par la passerelle. */
  async messageStatus(messageId: string, context: ApiKeyContext) {
    const recipient = await this.prisma.campaignRecipient.findFirst({
      where: { id: messageId, campaign: { customerId: context.customerId } },
      select: {
        id: true,
        destination: true,
        status: true,
        errorCode: true,
        sentAt: true,
        deliveredAt: true,
      },
    });

    // Un message appartenant à un autre client donne le même 404 qu'un
    // message inexistant : répondre 403 confirmerait son existence.
    if (!recipient) throw new NotFoundException('Message introuvable.');

    return recipient;
  }

  async balance(context: ApiKeyContext) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: context.customerId },
      select: { companyName: true, walletBalance: true, status: true },
    });

    if (!customer) throw new NotFoundException('Client introuvable.');

    return {
      customer: customer.companyName,
      balance: Number(customer.walletBalance),
      currency: 'XOF',
      status: customer.status,
    };
  }
}
