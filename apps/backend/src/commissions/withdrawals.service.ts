import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommissionStatus, Prisma, WithdrawalStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const BENEFICIARY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: { select: { name: true, label: true } },
} as const;

const REVIEWER_SELECT = { id: true, firstName: true, lastName: true } as const;

/** Une demande en attente ou validée immobilise le montant : il n'est plus disponible. */
const HOLDING_STATUSES: WithdrawalStatus[] = [
  WithdrawalStatus.PENDING,
  WithdrawalStatus.APPROVED,
  WithdrawalStatus.PAID,
];

@Injectable()
export class WithdrawalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Solde retirable d'un commercial.
   *
   * Seules les commissions validées comptent : une commission en attente est
   * un calcul qu'un responsable doit encore confirmer, pas une créance.
   *
   * On en retranche les demandes déjà déposées, y compris celles encore en
   * attente. Sans cela, un commercial pourrait déposer dix demandes du même
   * montant avant qu'aucune ne soit traitée.
   */
  async balance(userId: string) {
    const [approved, withdrawn] = await Promise.all([
      this.prisma.commission.aggregate({
        where: { userId, status: CommissionStatus.APPROVED },
        _sum: { amount: true },
      }),
      this.prisma.commissionWithdrawal.aggregate({
        where: { userId, status: { in: HOLDING_STATUSES } },
        _sum: { amount: true },
      }),
    ]);

    const earned = Number(approved._sum.amount ?? 0);
    const held = Number(withdrawn._sum.amount ?? 0);

    return {
      earned,
      held,
      available: Math.max(0, earned - held),
    };
  }

  /** Dépôt d'une demande par le commercial lui-même. */
  async request(userId: string, amount: number, reason?: string) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Le montant demandé doit être supérieur à zéro.');
    }

    const { available } = await this.balance(userId);

    if (available <= 0) {
      throw new BadRequestException(
        'Aucune commission validée n’est disponible au retrait pour l’instant.',
      );
    }

    if (amount > available) {
      throw new BadRequestException(
        `Le montant demandé dépasse votre solde disponible (${available.toFixed(2)}).`,
      );
    }

    const withdrawal = await this.prisma.commissionWithdrawal.create({
      data: {
        userId,
        amount: new Prisma.Decimal(amount.toFixed(2)),
        reason: reason?.trim() || null,
      },
      include: { user: { select: BENEFICIARY_SELECT } },
    });

    await this.audit.create({
      action: 'CREATE',
      entity: 'CommissionWithdrawal',
      entityId: withdrawal.id,
      description: `Demande de retrait de ${amount.toFixed(2)} déposée`,
      userId,
    });

    return withdrawal;
  }

  /**
   * Autorisation d'une demande.
   *
   * Le solde est recontrôlé ici : entre le dépôt et la décision, une
   * commission a pu être annulée ou une autre demande validée. Autoriser sans
   * revérifier laisserait passer un retrait devenu supérieur au dû.
   */
  async approve(id: string, reviewerId: string) {
    const withdrawal = await this.findOneOrFail(id);

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Seule une demande en attente peut être autorisée.');
    }

    // On exclut la demande en cours du calcul : elle est déjà comptée dans
    // les montants immobilisés.
    const { earned } = await this.balance(withdrawal.userId);
    const otherHeld = await this.prisma.commissionWithdrawal.aggregate({
      where: {
        userId: withdrawal.userId,
        status: { in: HOLDING_STATUSES },
        id: { not: id },
      },
      _sum: { amount: true },
    });

    const stillAvailable = earned - Number(otherHeld._sum.amount ?? 0);

    if (Number(withdrawal.amount) > stillAvailable) {
      throw new BadRequestException(
        `Le solde du bénéficiaire a changé depuis la demande : ${stillAvailable.toFixed(2)} disponible ` +
          `contre ${Number(withdrawal.amount).toFixed(2)} demandé. Refusez la demande ou faites-la redéposer.`,
      );
    }

    const updated = await this.prisma.commissionWithdrawal.update({
      where: { id },
      data: {
        status: WithdrawalStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
      include: {
        user: { select: BENEFICIARY_SELECT },
        reviewedBy: { select: REVIEWER_SELECT },
      },
    });

    await this.audit.create({
      action: 'UPDATE',
      entity: 'CommissionWithdrawal',
      entityId: id,
      description: `Retrait de ${Number(withdrawal.amount).toFixed(2)} autorisé`,
      userId: reviewerId,
    });

    return updated;
  }

  async reject(id: string, reviewerId: string, rejectionReason: string) {
    const withdrawal = await this.findOneOrFail(id);

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Seule une demande en attente peut être refusée.');
    }

    if (!rejectionReason?.trim() || rejectionReason.trim().length < 5) {
      throw new BadRequestException(
        'Un refus doit être motivé : le demandeur doit savoir quoi corriger.',
      );
    }

    const updated = await this.prisma.commissionWithdrawal.update({
      where: { id },
      data: {
        status: WithdrawalStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason.trim(),
      },
      include: {
        user: { select: BENEFICIARY_SELECT },
        reviewedBy: { select: REVIEWER_SELECT },
      },
    });

    await this.audit.create({
      action: 'UPDATE',
      entity: 'CommissionWithdrawal',
      entityId: id,
      description: `Retrait refusé — ${rejectionReason.trim()}`,
      userId: reviewerId,
    });

    return updated;
  }

  /**
   * Versement effectif.
   *
   * C'est ici que les commissions passent en PAID, les plus anciennes
   * d'abord, à hauteur du montant versé. Sans cela, le solde ne diminuerait
   * jamais et le même montant resterait indéfiniment retirable.
   */
  async markPaid(id: string, actorId: string, payload: { method?: string; reference?: string }) {
    const withdrawal = await this.findOneOrFail(id);

    if (withdrawal.status !== WithdrawalStatus.APPROVED) {
      throw new BadRequestException(
        'Seul un retrait autorisé peut être marqué comme versé.',
      );
    }

    const commissions = await this.prisma.commission.findMany({
      where: { userId: withdrawal.userId, status: CommissionStatus.APPROVED },
      orderBy: { createdAt: 'asc' },
      select: { id: true, amount: true },
    });

    let remaining = Number(withdrawal.amount);
    const toSettle: string[] = [];

    for (const commission of commissions) {
      if (remaining <= 0) break;
      toSettle.push(commission.id);
      remaining -= Number(commission.amount);
    }

    return this.prisma.$transaction(async (tx) => {
      if (toSettle.length > 0) {
        await tx.commission.updateMany({
          where: { id: { in: toSettle } },
          data: { status: CommissionStatus.PAID, paidAt: new Date() },
        });
      }

      const updated = await tx.commissionWithdrawal.update({
        where: { id },
        data: {
          status: WithdrawalStatus.PAID,
          method: payload.method ?? null,
          reference: payload.reference ?? null,
          paidAt: new Date(),
        },
        include: {
          user: { select: BENEFICIARY_SELECT },
          reviewedBy: { select: REVIEWER_SELECT },
        },
      });

      await this.audit.create({
        action: 'UPDATE',
        entity: 'CommissionWithdrawal',
        entityId: id,
        description:
          `Retrait de ${Number(withdrawal.amount).toFixed(2)} versé — ` +
          `${toSettle.length} commission(s) soldée(s)`,
        userId: actorId,
      });

      return updated;
    });
  }

  /** Un demandeur peut retirer sa demande tant qu'elle n'est pas traitée. */
  async cancel(id: string, actorId: string) {
    const withdrawal = await this.findOneOrFail(id);

    if (withdrawal.userId !== actorId) {
      throw new ForbiddenException('Vous ne pouvez annuler que vos propres demandes.');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Une demande déjà traitée ne peut plus être annulée.');
    }

    return this.prisma.commissionWithdrawal.update({
      where: { id },
      data: { status: WithdrawalStatus.CANCELLED },
    });
  }

  /** Historique, filtrable. `scopeToUserId` limite un commercial aux siens. */
  async findAll(filters: {
    userId?: string;
    status?: WithdrawalStatus;
    scopeToUserId?: string;
  }) {
    const where = {
      ...(filters.scopeToUserId
        ? { userId: filters.scopeToUserId }
        : filters.userId
          ? { userId: filters.userId }
          : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [data, aggregate] = await Promise.all([
      this.prisma.commissionWithdrawal.findMany({
        where,
        include: {
          user: { select: BENEFICIARY_SELECT },
          reviewedBy: { select: REVIEWER_SELECT },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.commissionWithdrawal.aggregate({
        where: { ...where, status: WithdrawalStatus.PAID },
        _sum: { amount: true },
      }),
    ]);

    return { data, totalPaid: Number(aggregate._sum.amount ?? 0) };
  }

  private async findOneOrFail(id: string) {
    const withdrawal = await this.prisma.commissionWithdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new NotFoundException('Demande de retrait introuvable.');
    return withdrawal;
  }
}
