import { Injectable } from '@nestjs/common';
import { SocialSource } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fil des actualités reçues.
   *
   * Pas de pagination classique mais un plafond : un fil de veille se
   * parcourt, il ne se feuillette pas. Au-delà de deux cents entrées,
   * personne ne remonte — mieux vaut filtrer par plateforme.
   */
  async findAll(filters: { source?: SocialSource; unreadOnly?: boolean } = {}) {
    const where = {
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.unreadOnly ? { isRead: false } : {}),
    };

    const [data, unread, bySource] = await Promise.all([
      this.prisma.socialUpdate.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: 200,
      }),
      this.prisma.socialUpdate.count({ where: { isRead: false } }),
      this.prisma.socialUpdate.groupBy({
        by: ['source'],
        _count: { _all: true },
      }),
    ]);

    return {
      data,
      unread,
      bySource: bySource
        .map((row) => ({ source: row.source, count: row._count._all }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /** Marque une entrée comme lue. */
  async markRead(id: string) {
    return this.prisma.socialUpdate.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Marque tout comme lu.
   *
   * Indispensable sur un fil de veille : après quelques jours d'absence, le
   * compteur atteint des dizaines d'entrées et les ouvrir une à une pour le
   * remettre à zéro n'apprend rien.
   */
  async markAllRead(source?: SocialSource) {
    const result = await this.prisma.socialUpdate.updateMany({
      where: { isRead: false, ...(source ? { source } : {}) },
      data: { isRead: true },
    });

    return { updated: result.count };
  }

  /** Purge des entrées anciennes, pour que le fil ne gonfle pas sans fin. */
  async purgeOlderThan(days: number) {
    const before = new Date(Date.now() - days * 86_400_000);

    const result = await this.prisma.socialUpdate.deleteMany({
      where: { receivedAt: { lt: before }, isRead: true },
    });

    return { deleted: result.count };
  }
}
