import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
async create(dto: CreateAuditLogDto) {
  return this.prisma.auditLog.create({
    data: {
      action: dto.action,
      entity: dto.entity,
      entityId: dto.entityId,
      description: dto.description,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
   ...(dto.userId && {
        user: {
          connect: {
            id: dto.userId,
          },
        },
      }),
    },

    include: {
      user: true,
    },
  });
}

  /**
   * Journal paginé.
   *
   * Le journal grossit à chaque action de chaque utilisateur : le renvoyer
   * en entier rendait l'écran inutilisable au bout de quelques mois — et
   * c'est justement l'écran qu'on ouvre quand quelque chose ne va pas.
   *
   * L'utilisateur n'est plus inclus en entier mais projeté : un journal ne
   * doit pas exposer les hachages de mot de passe ni les secrets 2FA.
   */
  async findAll(params: { page?: number; limit?: number; entity?: string; action?: string; userId?: string } = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 50));

    const where = {
      ...(params.entity ? { entity: params.entity } : {}),
      ...(params.action ? { action: params.action as never } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!log) {
      throw new NotFoundException('Journal introuvable');
    }

    return log;
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.auditLog.delete({
      where: { id },
    });
  }
}
