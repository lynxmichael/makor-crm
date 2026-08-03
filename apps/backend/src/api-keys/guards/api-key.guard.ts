import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiScope } from '@prisma/client';
import * as argon2 from 'argon2';

import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRED_SCOPES } from '../decorators/scopes.decorator';

/** Compteur d'appels en mémoire, par clé et par minute. */
const counters = new Map<string, { count: number; resetAt: number }>();

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const presented: string | undefined =
      request.headers['x-api-key'] ??
      (typeof request.headers.authorization === 'string' &&
      request.headers.authorization.startsWith('Bearer ')
        ? request.headers.authorization.slice(7)
        : undefined);

    if (!presented) {
      throw new UnauthorizedException('Clé d’API absente (en-tête x-api-key).');
    }

    // Le préfixe est la partie publique : il identifie la ligne sans
    // révéler le secret, et évite de comparer la valeur reçue à tous les
    // hachages enregistrés — ce qui deviendrait vite ingérable.
    const prefix = presented.split('_').slice(0, 3).join('_');

    const key = await this.prisma.apiKey.findUnique({
      where: { prefix },
      select: {
        id: true,
        keyHash: true,
        scopes: true,
        customerId: true,
        senderId: true,
        isActive: true,
        expiresAt: true,
        revokedAt: true,
        rateLimitPerMinute: true,
      },
    });

    // Message volontairement identique dans tous les cas d'échec
    // d'authentification : distinguer « clé inconnue » de « clé invalide »
    // renseignerait un attaquant sur la validité d'un préfixe deviné.
    const invalid = () => new UnauthorizedException('Clé d’API invalide.');

    if (!key) throw invalid();

    const matches = await argon2.verify(key.keyHash, presented).catch(() => false);
    if (!matches) throw invalid();

    if (!key.isActive || key.revokedAt) {
      throw new UnauthorizedException('Cette clé d’API a été révoquée.');
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new UnauthorizedException('Cette clé d’API a expiré.');
    }

    this.assertWithinRateLimit(key.id, key.rateLimitPerMinute);

    const required = this.reflector.getAllAndOverride<ApiScope[]>(REQUIRED_SCOPES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (required?.length && !required.every((scope) => key.scopes.includes(scope))) {
      throw new ForbiddenException(
        `Cette clé ne dispose pas des autorisations requises : ${required.join(', ')}.`,
      );
    }

    // Mise à disposition du contexte partenaire pour les contrôleurs.
    request.apiKey = key;

    // Compteurs mis à jour sans bloquer la réponse : un échec d'écriture de
    // statistique ne doit pas faire échouer un envoi.
    void this.prisma.apiKey
      .update({
        where: { id: key.id },
        data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
      })
      .catch(() => undefined);

    return true;
  }

  /**
   * Limitation de débit par clé.
   *
   * Volontairement en mémoire : sur une instance unique cela suffit, et
   * cela évite un aller-retour Redis sur le chemin critique. Dès que le
   * backend tournera en plusieurs répliques, ce compteur devra passer sur
   * Redis — sinon chaque réplique appliquera son propre plafond.
   */
  private assertWithinRateLimit(keyId: string, limit: number) {
    if (!limit) return;

    const now = Date.now();
    const entry = counters.get(keyId);

    if (!entry || entry.resetAt < now) {
      counters.set(keyId, { count: 1, resetAt: now + 60_000 });
      return;
    }

    entry.count += 1;

    if (entry.count > limit) {
      throw new ForbiddenException(
        `Plafond de ${limit} appels par minute atteint. Réessayez dans un instant.`,
      );
    }
  }
}
