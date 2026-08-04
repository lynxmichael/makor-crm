import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignableEntity, SignatureStatus } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QuotesService } from '../quotes/quotes.service';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import { ContractsService } from '../contracts/contracts.service';

import {
  SIGNATURE_PROVIDER,
  type SignatureProvider,
} from './signature-provider.interface';
import { CreateSignatureRequestDto } from './dto/create-signature-request.dto';
import { SubmitSignatureDto } from './dto/submit-signature.dto';

/** Validité par défaut d'un lien de signature, en jours. */
const DEFAULT_VALIDITY_DAYS = 30;

@Injectable()
export class SignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly quotes: QuotesService,
    private readonly purchaseOrders: PurchaseOrdersService,
    private readonly contracts: ContractsService,
    @Inject(SIGNATURE_PROVIDER,
    private readonly events: EventEmitter2,
  ) private readonly provider: SignatureProvider,
  ) {}

  // -------------------------------------------------------------------------
  // Côté CRM
  // -------------------------------------------------------------------------

  findAll(entityType?: SignableEntity, entityId?: string) {
    return this.prisma.signatureRequest.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Émet une demande de signature.
   *
   * L'empreinte du PDF est calculée maintenant et figée : c'est elle qui
   * permettra d'affirmer que le document signé est bien celui qui a été
   * présenté. Sans cette empreinte, une signature électronique simple ne
   * prouve pas grand-chose — le document pourrait avoir été modifié après
   * coup.
   */
  async create(dto: CreateSignatureRequestDto, authorId: string) {
    const { buffer, name } = await this.renderDocument(dto.entityType, dto.entityId);

    // Une demande encore en attente sur la même pièce est annulée : deux
    // liens valides en parallèle sur un même document ouvrent la porte à
    // deux signatures contradictoires.
    await this.prisma.signatureRequest.updateMany({
      where: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        status: { in: [SignatureStatus.PENDING, SignatureStatus.VIEWED] },
      },
      data: { status: SignatureStatus.CANCELLED },
    });

    const token = randomBytes(32).toString('base64url');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (dto.validityDays ?? DEFAULT_VALIDITY_DAYS));

    const request = await this.prisma.signatureRequest.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        signerName: dto.signerName,
        signerEmail: dto.signerEmail,
        signerPhone: dto.signerPhone ?? null,
        token,
        documentHash: createHash('sha256').update(buffer).digest('hex'),
        expiresAt,
        requestedById: authorId,
      },
    });

    const result = await this.provider.dispatch({
      requestId: request.id,
      signerName: dto.signerName,
      signerEmail: dto.signerEmail,
      documentName: name,
      documentBuffer: buffer,
      signUrl: `${this.config.get<string>('FRONTEND_URL') ?? ''}/signature/${token}`,
    });

    await this.prisma.signatureRequest.update({
      where: { id: request.id },
      data: {
        providerName: result.providerName,
        providerRequestId: result.providerRequestId ?? null,
      },
    });

    await this.audit.create({
      action: 'CREATE',
      entity: 'SignatureRequest',
      entityId: request.id,
      description: `Demande de signature envoyée à ${dto.signerEmail} pour ${dto.entityType} ${dto.entityId}`,
      userId: authorId,
    });

    // Le jeton n'est jamais renvoyé au CRM : il ne doit circuler que dans
    // l'e-mail adressé au signataire.
    const { token: _omitted, ...safe } = request;
    return safe;
  }

  async cancel(id: string, authorId: string) {
    const request = await this.prisma.signatureRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Demande introuvable.');

    if (request.status === SignatureStatus.SIGNED) {
      throw new BadRequestException('Un document déjà signé ne peut pas être annulé.');
    }

    await this.audit.create({
      action: 'UPDATE',
      entity: 'SignatureRequest',
      entityId: id,
      description: 'Demande de signature annulée',
      userId: authorId,
    });

    return this.prisma.signatureRequest.update({
      where: { id },
      data: { status: SignatureStatus.CANCELLED },
    });
  }

  // -------------------------------------------------------------------------
  // Côté signataire — routes publiques, aucune authentification
  // -------------------------------------------------------------------------

  /** Contenu présenté au signataire. Marque la demande comme consultée. */
  async openByToken(token: string) {
    const request = await this.findValidByToken(token);

    if (request.status === SignatureStatus.PENDING) {
      await this.prisma.signatureRequest.update({
        where: { id: request.id },
        data: { status: SignatureStatus.VIEWED, viewedAt: new Date() },
      });
    }

    const { name } = await this.renderDocument(request.entityType, request.entityId);

    return {
      id: request.id,
      documentName: name,
      entityType: request.entityType,
      signerName: request.signerName,
      status: request.status === SignatureStatus.PENDING ? SignatureStatus.VIEWED : request.status,
      expiresAt: request.expiresAt,
      signedAt: request.signedAt,
    };
  }

  /** PDF présenté au signataire, servi sans authentification via le jeton. */
  async documentByToken(token: string) {
    const request = await this.findValidByToken(token);
    return this.renderDocument(request.entityType, request.entityId);
  }

  /**
   * Apposition de la signature.
   *
   * L'empreinte du document est recalculée et comparée à celle figée à
   * l'envoi. Si elle diffère, le document a changé entre-temps : on refuse
   * plutôt que de recueillir une signature sur une pièce que le signataire
   * n'a pas vue.
   */
  async sign(token: string, dto: SubmitSignatureDto, ip?: string, userAgent?: string) {
    const request = await this.findValidByToken(token);

    if (request.status === SignatureStatus.SIGNED) {
      throw new BadRequestException('Ce document a déjà été signé.');
    }

    const { buffer } = await this.renderDocument(request.entityType, request.entityId);
    const currentHash = createHash('sha256').update(buffer).digest('hex');

    if (currentHash !== request.documentHash) {
      throw new BadRequestException(
        'Le document a été modifié depuis l’envoi de la demande. Une nouvelle demande de signature doit être émise.',
      );
    }

    const signed = await this.prisma.signatureRequest.update({
      where: { id: request.id },
      data: {
        status: SignatureStatus.SIGNED,
        signatureData: dto.signatureData,
        signatureType: dto.signatureType,
        signedAt: new Date(),
        signedIp: ip ?? null,
        signedUserAgent: userAgent ?? null,
      },
    });

    await this.applyToSource(request.entityType, request.entityId);

    await this.audit.create({
      action: 'UPDATE',
      entity: 'SignatureRequest',
      entityId: request.id,
      description: `Document signé par ${request.signerName} (${request.signerEmail})`,
      ipAddress: ip,
      userAgent,
    });

    this.events.emit('workflow.trigger', {
      trigger: 'SIGNATURE_SIGNED',
      entityType: request.entityType,
      entityId: request.entityId,
      payload: {
        signerName: request.signerName,
        signerEmail: request.signerEmail,
        signedAt: signed.signedAt,
        requestId: request.id,
      },
    });

    return { id: signed.id, status: signed.status, signedAt: signed.signedAt };
  }

  async refuse(token: string, reason: string, ip?: string) {
    const request = await this.findValidByToken(token);

    if (request.status === SignatureStatus.SIGNED) {
      throw new BadRequestException('Ce document a déjà été signé.');
    }

    await this.audit.create({
      action: 'UPDATE',
      entity: 'SignatureRequest',
      entityId: request.id,
      description: `Signature refusée par ${request.signerName} : ${reason}`,
      ipAddress: ip,
    });

    const refused = await this.prisma.signatureRequest.update({
      where: { id: request.id },
      data: {
        status: SignatureStatus.REFUSED,
        refusedAt: new Date(),
        refusalReason: reason,
      },
      select: { id: true, status: true },
    });

    this.events.emit('workflow.trigger', {
      trigger: 'SIGNATURE_REFUSED',
      entityType: request.entityType,
      entityId: request.entityId,
      payload: {
        signerName: request.signerName,
        signerEmail: request.signerEmail,
        reason,
        requestId: request.id,
      },
    });

    return refused;
  }

  /** Certificat de preuve, consultable après signature. */
  async proof(id: string) {
    const request = await this.prisma.signatureRequest.findUnique({
      where: { id },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        signerName: true,
        signerEmail: true,
        status: true,
        documentHash: true,
        signatureType: true,
        signedAt: true,
        signedIp: true,
        signedUserAgent: true,
        viewedAt: true,
        providerName: true,
        createdAt: true,
      },
    });

    if (!request) throw new NotFoundException('Demande introuvable.');

    if (request.status !== SignatureStatus.SIGNED) {
      throw new BadRequestException('Ce document n’a pas encore été signé.');
    }

    return request;
  }

  // -------------------------------------------------------------------------

  private async findValidByToken(token: string) {
    const request = await this.prisma.signatureRequest.findUnique({ where: { token } });

    if (!request) throw new NotFoundException('Lien de signature invalide.');

    if (request.status === SignatureStatus.CANCELLED) {
      throw new ForbiddenException('Cette demande de signature a été annulée.');
    }

    if (request.expiresAt < new Date()) {
      if (request.status !== SignatureStatus.EXPIRED) {
        await this.prisma.signatureRequest.update({
          where: { id: request.id },
          data: { status: SignatureStatus.EXPIRED },
        });
      }
      throw new ForbiddenException('Ce lien de signature a expiré.');
    }

    return request;
  }

  /** Reconstruit le PDF depuis la source, sans jamais le stocker en double. */
  private async renderDocument(entityType: SignableEntity, entityId: string) {
    switch (entityType) {
      case SignableEntity.QUOTE: {
        const { pdf, number } = await this.quotes.getPdf(entityId);
        return { buffer: pdf, name: `Devis ${number}` };
      }
      case SignableEntity.PURCHASE_ORDER: {
        const { pdf, number } = await this.purchaseOrders.getPdf(entityId);
        return { buffer: pdf, name: `Bon de commande ${number}` };
      }
      default: {
        const { pdf, number } = await this.contracts.getPdf(entityId);
        return { buffer: pdf, name: `Contrat ${number}` };
      }
    }
  }

  /**
   * Répercute la signature sur la pièce d'origine. C'est ce qui fait que la
   * signature électronique remplace vraiment le circuit papier : sans cela,
   * un bon de commande signé resterait « envoyé » dans le CRM.
   */
  private async applyToSource(entityType: SignableEntity, entityId: string) {
    if (entityType === SignableEntity.PURCHASE_ORDER) {
      await this.prisma.purchaseOrder.update({
        where: { id: entityId },
        data: { status: 'SIGNED', signedAt: new Date() },
      });
      return;
    }

    if (entityType === SignableEntity.QUOTE) {
      await this.prisma.quote.update({
        where: { id: entityId },
        data: { status: 'ACCEPTED' },
      });
      return;
    }

    await this.prisma.contract.update({
      where: { id: entityId },
      data: { status: 'ACTIVE' },
    });
  }
}
