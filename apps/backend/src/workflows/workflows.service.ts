import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.workflow.findMany({
      include: {
        actions: { orderBy: { position: 'asc' } },
        _count: { select: { runs: true } },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: { actions: { orderBy: { position: 'asc' } } },
    });

    if (!workflow) throw new NotFoundException('Règle introuvable.');
    return workflow;
  }

  async create(dto: CreateWorkflowDto, authorId: string) {
    const workflow = await this.prisma.workflow.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        trigger: dto.trigger,
        conditions: (dto.conditions ?? []) as Prisma.InputJsonValue,
        delayMinutes: dto.delayMinutes ?? 0,
        maxRunsPerDay: dto.maxRunsPerDay ?? 500,
        isActive: dto.isActive ?? true,
        createdById: authorId,
        actions: {
          create: dto.actions.map((action, index) => ({
            type: action.type,
            config: (action.config ?? {}) as Prisma.InputJsonValue,
            position: action.position ?? index,
          })),
        },
      },
      include: { actions: true },
    });

    await this.audit.create({
      action: 'CREATE',
      entity: 'Workflow',
      entityId: workflow.id,
      description: `Règle d'automatisation « ${dto.name} » créée`,
      userId: authorId,
    });

    return workflow;
  }

  /**
   * Les actions sont remplacées en bloc plutôt que rapprochées une à une :
   * réordonner ou retirer une action produirait sinon des orphelines, et le
   * volume par règle reste faible.
   */
  async update(id: string, dto: UpdateWorkflowDto) {
    await this.findOne(id);

    if (dto.actions) {
      await this.prisma.workflowAction.deleteMany({ where: { workflowId: id } });
    }

    return this.prisma.workflow.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.trigger !== undefined ? { trigger: dto.trigger } : {}),
        ...(dto.conditions !== undefined
          ? { conditions: dto.conditions as Prisma.InputJsonValue }
          : {}),
        ...(dto.delayMinutes !== undefined ? { delayMinutes: dto.delayMinutes } : {}),
        ...(dto.maxRunsPerDay !== undefined ? { maxRunsPerDay: dto.maxRunsPerDay } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.actions
          ? {
              actions: {
                create: dto.actions.map((action, index) => ({
                  type: action.type,
                  config: (action.config ?? {}) as Prisma.InputJsonValue,
                  position: action.position ?? index,
                })),
              },
            }
          : {}),
      },
      include: { actions: { orderBy: { position: 'asc' } } },
    });
  }

  async remove(id: string, authorId: string) {
    const workflow = await this.findOne(id);

    await this.prisma.workflow.delete({ where: { id } });

    await this.audit.create({
      action: 'DELETE',
      entity: 'Workflow',
      entityId: id,
      description: `Règle d'automatisation « ${workflow.name} » supprimée`,
      userId: authorId,
    });

    return { id };
  }

  /** Journal d'exécution — indispensable pour diagnostiquer une règle muette. */
  runs(id: string, limit = 50) {
    return this.prisma.workflowRun.findMany({
      where: { workflowId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
