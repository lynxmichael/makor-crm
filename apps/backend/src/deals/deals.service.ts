import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

import { PipelineStagesService } from '../pipeline-stages/pipeline-stages.service';
import { AuditService } from '../audit/audit.service';

import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { MoveDealStageDto } from './dto/move-stage.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipelineStagesService: PipelineStagesService,
    private readonly auditService: AuditService,
    private readonly events: EventEmitter2
  ) {}

  async create(dto: CreateDealDto) {
    const stageId = dto.stageId ?? (await this.pipelineStagesService.getDefaultStage()).id;

    return this.prisma.deal.create({
      data: {
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        probability: dto.probability ?? 0,

        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,

        stage: { connect: { id: stageId } },
        assignedTo: { connect: { id: dto.assignedToId } },

        ...(dto.customerId && { customer: { connect: { id: dto.customerId } } }),
        ...(dto.leadId && { lead: { connect: { id: dto.leadId } } }),
      },

      include: {
        assignedTo: true,
        customer: true,
        lead: true,
        stage: true,
      },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    stageId?: string;
    assignedToId?: string;
    customerId?: string;
    leadId?: string;
  }) {
    const { page, limit, search, stageId, assignedToId, customerId, leadId } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.DealWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},

        stageId ? { stageId } : {},
        assignedToId ? { assignedToId } : {},
        customerId ? { customerId } : {},
        leadId ? { leadId } : {},
      ],
    };

    const [deals, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        include: { assignedTo: true, customer: true, lead: true, stage: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.deal.count({ where }),
    ]);

    return {
      data: deals,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Vue pipeline : deals groupés par étape, pour l'affichage Kanban. */
  async board() {
    const stages = await this.prisma.pipelineStage.findMany({
      orderBy: { order: 'asc' },
      include: {
        deals: {
          include: { assignedTo: true, customer: true, lead: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    return stages.map((stage) => ({
      stage: { id: stage.id, name: stage.name, order: stage.order, color: stage.color },
      deals: stage.deals,
      totalValue: stage.deals.reduce((sum, d) => sum + Number(d.amount), 0),
    }));
  }

  async findOne(id: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        customer: true,
        lead: true,
        stage: true,
        activities: { orderBy: { dueDate: 'asc' } },
        quotes: { orderBy: { createdAt: 'desc' } },
        stageHistory: {
          include: { fromStage: true, toStage: true, changedBy: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!deal) {
      throw new NotFoundException('Opportunité introuvable');
    }

    return deal;
  }

  async update(id: string, dto: UpdateDealDto) {
    await this.findOne(id);

    return this.prisma.deal.update({
      where: { id },

      data: {
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        probability: dto.probability,

        expectedCloseDate:
          dto.expectedCloseDate !== undefined
            ? dto.expectedCloseDate
              ? new Date(dto.expectedCloseDate)
              : null
            : undefined,

        // `undefined` laisse la valeur en place, `null` l'efface : on ne
        // touche à la qualification que si le client l'envoie explicitement.
        ...(dto.qualification !== undefined && { qualification: dto.qualification }),
        ...(dto.goLiveChecklist !== undefined && { goLiveChecklist: dto.goLiveChecklist }),

        ...(dto.assignedToId && { assignedTo: { connect: { id: dto.assignedToId } } }),
        ...(dto.customerId && { customer: { connect: { id: dto.customerId } } }),
        ...(dto.leadId && { lead: { connect: { id: dto.leadId } } }),
      },

      include: { assignedTo: true, customer: true, lead: true, stage: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.deal.delete({ where: { id } });
  }

  /**
   * Déplace un deal vers une nouvelle étape du pipeline, avec traçabilité
   * (CDC §4.6 "historique") et glisser-déposer conditionné : une étape
   * marquée `requiresSignedOrder` exige un bon de commande signé.
   */
  async moveStage(id: string, dto: MoveDealStageDto, changedById?: string) {
    const deal = await this.findOne(id);
    const targetStage = await this.pipelineStagesService.findOne(dto.stageId);

    if (targetStage.requiresSignedOrder) {
      const signedOrder = await this.prisma.purchaseOrder.findFirst({
        where: {
          status: 'SIGNED',
          quote: { dealId: id },
        },
      });

      if (!signedOrder) {
        throw new BadRequestException(
          `Impossible de déplacer ce deal vers "${targetStage.name}" : aucun bon de commande signé n'est associé.`,
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.deal.update({
        where: { id },
        data: {
          stage: { connect: { id: targetStage.id } },
          ...(targetStage.isClosedWon && { probability: 100 }),
          ...(targetStage.isClosedLost && { probability: 0 }),
        },
        include: { assignedTo: true, customer: true, lead: true, stage: true },
      });

      await tx.dealStageHistory.create({
        data: {
          dealId: id,
          fromStageId: deal.stageId,
          toStageId: targetStage.id,
          changedById,
          note: dto.note,
        },
      });

      return result;
    });

    await this.auditService.create({
      action: 'UPDATE',
      entity: 'Deal',
      entityId: id,
      description: `Étape déplacée vers "${targetStage.name}"`,
      userId: changedById,
    });

    // Point d'accroche du moteur de workflow. La charge utile porte l'étape
    // d'origine ET la nouvelle : une règle du type « alerter si une affaire
    // revient en arrière » a besoin des deux.
    this.events.emit('workflow.trigger', {
      trigger: 'DEAL_STAGE_CHANGED',
      entityType: 'DEAL',
      entityId: id,
      actorId: changedById,
      payload: {
        title: updated.title,
        amount: Number(updated.amount),
        probability: updated.probability,
        stageName: targetStage.name,
        previousStageId: deal.stageId,
        isClosedWon: targetStage.isClosedWon,
        isClosedLost: targetStage.isClosedLost,
        customerId: updated.customerId,
        assignedToId: updated.assignedToId,
      },
    });

    // Conversion automatique Prospect -> Client "sans ressaisie" (CDC §4.3)
    // lorsque le deal atteint une étape de victoire.
    if (targetStage.isClosedWon && !updated.customerId && updated.leadId) {
      await this.convertLeadToCustomer(updated.leadId, id);
    }

    return this.findOne(id);
  }

  /**
   * Convertit un prospect (Lead) qualifié en client (Customer) sans
   * ressaisie des informations déjà saisies, et relie le deal gagné au
   * nouveau client.
   */
  private async convertLeadToCustomer(leadId: string, dealId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead) return;

    const customer = await this.prisma.customer.create({
      data: {
        code: `CUST-${Date.now()}`,
        companyName: lead.company ?? `${lead.firstName} ${lead.lastName}`,
        sector: lead.sector,
        email: lead.email,
        phone: lead.phone,
        assignedToId: lead.assignedToId,
        contacts: {
          create: {
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            jobTitle: lead.jobTitle,
            isPrimary: true,
            assignedToId: lead.assignedToId,
          },
        },
      },
    });

    await this.prisma.$transaction([
      this.prisma.deal.update({ where: { id: dealId }, data: { customerId: customer.id } }),
      this.prisma.lead.update({ where: { id: leadId }, data: { status: 'WON' } }),
    ]);

    return customer;
  }
}
