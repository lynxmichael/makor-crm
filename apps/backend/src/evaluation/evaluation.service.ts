import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityStatus, ActivityType, CancellationReason } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const AGENT_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
  role: { select: { name: true, label: true } },
} as const;

@Injectable()
export class EvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Annulation d'un rendez-vous, avec justification obligatoire
   * (demande du 31/07/2026).
   *
   * La contrainte vit ici et non dans le formulaire : l'API reste
   * appelable directement, et un taux d'annulation sans motifs ne dit rien
   * d'exploitable — c'est précisément l'information qu'on cherche.
   */
  async cancelActivity(
    id: string,
    input: { reason: CancellationReason; note: string },
    actorId: string,
  ) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, assignedToId: true },
    });

    if (!activity) throw new NotFoundException('Activité introuvable.');

    if (activity.status === ActivityStatus.COMPLETED) {
      throw new BadRequestException(
        'Une activité déjà réalisée ne peut pas être annulée. Corrigez son statut si nécessaire.',
      );
    }

    if (!input.note?.trim() || input.note.trim().length < 10) {
      throw new BadRequestException(
        'Le motif d’annulation doit être expliqué en une phrase au moins (10 caractères).',
      );
    }

    const cancelled = await this.prisma.activity.update({
      where: { id },
      data: {
        status: ActivityStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: input.reason,
        cancellationNote: input.note.trim(),
      },
    });

    await this.audit.create({
      action: 'UPDATE',
      entity: 'Activity',
      entityId: id,
      description: `Rendez-vous « ${activity.title} » annulé — ${input.reason} : ${input.note.trim()}`,
      userId: actorId,
    });

    return cancelled;
  }

  /**
   * Évaluation par commercial sur une période.
   *
   * On compte les rendez-vous « pris » (toutes activités de type MEETING
   * créées) et « réalisés » (statut COMPLETED). Le taux de réalisation est
   * l'indicateur utile : un commercial qui prend beaucoup de rendez-vous
   * sans en honorer aucun n'est pas plus performant qu'un autre.
   */
  async teamEvaluation(from?: Date, to?: Date, departmentId?: string) {
    const period = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lt: to } : {}),
    };

    const agents = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { name: { in: ['COMMERCIAL', 'SUPERVISEUR'] } },
        ...(departmentId ? { departmentId } : {}),
      },
      select: AGENT_SELECT,
    });

    return Promise.all(
      agents.map(async (agent) => {
        const base = {
          assignedToId: agent.id,
          type: ActivityType.MEETING,
          ...(from || to ? { createdAt: period } : {}),
        };

        const [taken, completed, cancelled, unjustified] = await Promise.all([
          this.prisma.activity.count({ where: base }),
          this.prisma.activity.count({
            where: { ...base, status: ActivityStatus.COMPLETED },
          }),
          this.prisma.activity.count({
            where: { ...base, status: ActivityStatus.CANCELLED },
          }),
          // Annulations antérieures à la mise en place de l'obligation, ou
          // passées par une autre voie : on les isole pour qu'elles soient
          // régularisées plutôt que noyées dans le total.
          this.prisma.activity.count({
            where: { ...base, status: ActivityStatus.CANCELLED, cancellationNote: null },
          }),
        ]);

        return {
          agent,
          meetingsTaken: taken,
          meetingsCompleted: completed,
          meetingsCancelled: cancelled,
          unjustifiedCancellations: unjustified,
          completionRate: taken ? completed / taken : 0,
          cancellationRate: taken ? cancelled / taken : 0,
        };
      }),
    );
  }

  /** Détail des annulations d'un commercial, motifs compris. */
  async cancellations(userId: string, from?: Date, to?: Date) {
    return this.prisma.activity.findMany({
      where: {
        assignedToId: userId,
        type: ActivityType.MEETING,
        status: ActivityStatus.CANCELLED,
        ...(from || to
          ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } }
          : {}),
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        cancelledAt: true,
        cancellationReason: true,
        cancellationNote: true,
        customer: { select: { companyName: true } },
      },
      orderBy: { cancelledAt: 'desc' },
      take: 100,
    });
  }
}
