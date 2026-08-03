import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApiScope } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

/** Ce qui est renvoyé au client : jamais le haché. */
const PUBLIC_SELECT = {
  id: true,
  name: true,
  prefix: true,
  scopes: true,
  customerId: true,
  senderId: true,
  rateLimitPerMinute: true,
  isActive: true,
  expiresAt: true,
  lastUsedAt: true,
  usageCount: true,
  revokedAt: true,
  createdAt: true,
  customer: { select: { id: true, companyName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(customerId?: string) {
    return this.prisma.apiKey.findMany({
      where: customerId ? { customerId } : undefined,
      select: PUBLIC_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id }, select: PUBLIC_SELECT });
    if (!key) throw new NotFoundException('Clé introuvable.');
    return key;
  }

  /**
   * Création d'une clé.
   *
   * La valeur complète n'est renvoyée qu'ici, une seule fois : seul son
   * haché est conservé. Nous ne pouvons donc pas la retrouver plus tard —
   * seulement la révoquer et en émettre une nouvelle. C'est le
   * comportement attendu d'un secret d'intégration, et l'interface doit le
   * dire clairement au moment de l'affichage.
   */
  async create(dto: CreateApiKeyDto, authorId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
      select: { id: true, companyName: true },
    });

    if (!customer) throw new NotFoundException('Client introuvable.');

    // Préfixe lisible pour identifier la clé sans la révéler, puis 32 octets
    // aléatoires. Le préfixe permet de retrouver la ligne en base sans
    // comparer la valeur reçue à tous les hachages enregistrés.
    const environment = dto.testMode ? 'test' : 'live';
    const prefix = `mk_${environment}_${randomBytes(4).toString('hex')}`;
    const secret = randomBytes(32).toString('base64url');
    const fullKey = `${prefix}_${secret}`;

    const created = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        prefix,
        keyHash: await argon2.hash(fullKey),
        scopes: dto.scopes?.length ? dto.scopes : [ApiScope.MESSAGES_SEND],
        customerId: dto.customerId,
        senderId: dto.senderId ?? null,
        rateLimitPerMinute: dto.rateLimitPerMinute ?? 60,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdById: authorId,
      },
      select: PUBLIC_SELECT,
    });

    await this.audit.create({
      action: 'CREATE',
      entity: 'ApiKey',
      entityId: created.id,
      description: `Clé d'API « ${dto.name} » émise pour ${customer.companyName}`,
      userId: authorId,
    });

    return { ...created, key: fullKey };
  }

  async update(id: string, dto: UpdateApiKeyDto) {
    await this.findOne(id);

    return this.prisma.apiKey.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.scopes !== undefined ? { scopes: dto.scopes } : {}),
        ...(dto.senderId !== undefined ? { senderId: dto.senderId } : {}),
        ...(dto.rateLimitPerMinute !== undefined
          ? { rateLimitPerMinute: dto.rateLimitPerMinute }
          : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: PUBLIC_SELECT,
    });
  }

  /**
   * Révocation. On ne supprime pas la ligne : le journal des appels y est
   * rattaché, et retracer l'origine d'un envoi passé doit rester possible
   * après coupure de l'accès.
   */
  async revoke(id: string, authorId: string) {
    const key = await this.findOne(id);

    if (key.revokedAt) {
      throw new BadRequestException('Cette clé est déjà révoquée.');
    }

    const revoked = await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() },
      select: PUBLIC_SELECT,
    });

    await this.audit.create({
      action: 'UPDATE',
      entity: 'ApiKey',
      entityId: id,
      description: `Clé d'API « ${key.name} » révoquée`,
      userId: authorId,
    });

    return revoked;
  }

  /** Volumétrie et taux d'erreur d'une clé, pour le diagnostic d'intégration. */
  async stats(id: string, days = 7) {
    await this.findOne(id);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [total, failed, recent] = await Promise.all([
      this.prisma.apiRequest.count({ where: { apiKeyId: id, createdAt: { gte: since } } }),
      this.prisma.apiRequest.count({
        where: { apiKeyId: id, createdAt: { gte: since }, status: { gte: 400 } },
      }),
      this.prisma.apiRequest.findMany({
        where: { apiKeyId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          method: true,
          path: true,
          status: true,
          durationMs: true,
          errorCode: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      periodDays: days,
      total,
      failed,
      errorRate: total ? failed / total : 0,
      recent,
    };
  }
}
