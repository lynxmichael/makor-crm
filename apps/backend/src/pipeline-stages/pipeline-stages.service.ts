import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePipelineStageDto, UpdatePipelineStageDto } from './dto/pipeline-stage.dto';

/**
 * Pipeline commercial personnalisable (CDC §4.6). Les étapes ne sont plus
 * un enum figé : elles sont créées et réordonnées par le Super Admin, ce
 * qui permet d'adapter le pipeline sans nouvelle mise en production.
 */
@Injectable()
export class PipelineStagesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePipelineStageDto) {
    return this.prisma.pipelineStage.create({
      data: {
        name: dto.name,
        order: dto.order,
        isClosedWon: dto.isClosedWon ?? false,
        isClosedLost: dto.isClosedLost ?? false,
        requiresSignedOrder: dto.requiresSignedOrder ?? false,
        color: dto.color ?? '#6366f1',
      },
    });
  }

  findAll() {
    return this.prisma.pipelineStage.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { deals: true } },
      },
    });
  }

  async findOne(id: string) {
    const stage = await this.prisma.pipelineStage.findUnique({ where: { id } });

    if (!stage) {
      throw new NotFoundException('Étape de pipeline introuvable');
    }

    return stage;
  }

  async update(id: string, dto: UpdatePipelineStageDto) {
    await this.findOne(id);

    return this.prisma.pipelineStage.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const dealsOnStage = await this.prisma.deal.count({ where: { stageId: id } });

    if (dealsOnStage > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cette étape : ${dealsOnStage} opportunité(s) y sont actuellement rattachées.`,
      );
    }

    return this.prisma.pipelineStage.delete({ where: { id } });
  }

  /** Étape par défaut pour un nouveau deal (la première dans l'ordre). */
  async getDefaultStage() {
    const stage = await this.prisma.pipelineStage.findFirst({
      orderBy: { order: 'asc' },
    });

    if (!stage) {
      throw new BadRequestException(
        "Aucune étape de pipeline n'est configurée. Contactez un Super Admin.",
      );
    }

    return stage;
  }
}
