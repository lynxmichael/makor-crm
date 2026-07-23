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

  async findAll() {
    return this.prisma.auditLog.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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
