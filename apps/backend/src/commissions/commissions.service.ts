import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommissionBase, CommissionStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { ComputeCommissionsDto } from './dto/compute-commissions.dto';

const BENEFICIARY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  role: { select: { name: true, label: true } },
} as const;

@Injectable()
export class CommissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // -------------------------------------------------------------------------
  // Barèmes
  // -------------------------------------------------------------------------

  plans() {
    return this.prisma.commissionPlan.findMany({
      include: {
        role: { select: { id: true, name: true, label: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createPlan(dto: CreatePlanDto) {
    if (dto.rate <= 0 || dto.rate > 1) {
      throw new BadRequestException(
        'Le taux s’exprime en fraction : 0,05 pour 5 %. Il doit être compris entre 0 et 1.',
      );
    }

    return this.prisma.commissionPlan.create({
      data: {
        name: dto.name,
        rate: new Prisma.Decimal(dto.rate),
        base: dto.base,
        trigger: dto.trigger,
        roleId: dto.roleId ?? null,
        userId: dto.userId ?? null,
        minimumAmount: dto.minimumAmount ? new Prisma.Decimal(dto.minimumAmount) : null,
        capAmount: dto.capAmount ? new Prisma.Decimal(dto.capAmount) : null,
      },
    });
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    await this.planOrFail(id);

    return this.prisma.commissionPlan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.rate !== undefined ? { rate: new Prisma.Decimal(dto.rate) } : {}),
        ...(dto.base !== undefined ? { base: dto.base } : {}),
        ...(dto.trigger !== undefined ? { trigger: dto.trigger } : {}),
        ...(dto.minimumAmount !== undefined
          ? { minimumAmount: dto.minimumAmount ? new Prisma.Decimal(dto.minimumAmount) : null }
          : {}),
        ...(dto.capAmount !== undefined
          ? { capAmount: dto.capAmount ? new Prisma.Decimal(dto.capAmount) : null }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  /**
   * Un barème n'est jamais supprimé s'il a produit des commissions : les
   * lignes calculées y renvoient, et l'historique doit rester lisible.
   */
  async removePlan(id: string) {
    await this.planOrFail(id);

    const used = await this.prisma.commission.count({ where: { planId: id } });

    if (used > 0) {
      return this.prisma.commissionPlan.update({
        where: { id },
        data: { isActive: false },
      });
    }

    await this.prisma.commissionPlan.delete({ where: { id } });
    return { id };
  }

  private async planOrFail(id: string) {
    const plan = await this.prisma.commissionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Barème introuvable.');
    return plan;
  }

  // -------------------------------------------------------------------------
  // Calcul
  // -------------------------------------------------------------------------

  /**
   * Calcule les commissions d'une période (AAAA-MM).
   *
   * L'opération est idempotente : la contrainte d'unicité
   * `(sourceType, sourceId, userId)` fait qu'un même fait générateur ne
   * produit qu'une ligne. On peut donc relancer un calcul sans créer de
   * doublons — ce qui est indispensable quand une facture est encaissée
   * après un premier passage.
   *
   * Les lignes déjà validées ou payées ne sont jamais recalculées : une
   * commission approuvée est un engagement, pas une valeur dérivée.
   */
  async compute(dto: ComputeCommissionsDto, actorId: string) {
    const period = dto.period;

    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new BadRequestException('La période attendue est au format AAAA-MM.');
    }

    const [year, month] = period.split('-').map(Number);
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 1));

    const plans = await this.prisma.commissionPlan.findMany({
      where: { isActive: true },
      include: { role: { select: { name: true } } },
    });

    if (plans.length === 0) {
      throw new BadRequestException(
        'Aucun barème actif : définissez-en un avant de lancer un calcul.',
      );
    }

    // Les factures encaissées sur la période constituent le fait générateur.
    //
    // Le bénéficiaire est le chargé de compte du client — `Invoice` ne porte
    // pas d'auteur, et rattacher la commission à qui a saisi la facture
    // créditerait le service financier plutôt que le commercial.
    const invoices = await this.prisma.invoice.findMany({
      where: { status: 'PAID', updatedAt: { gte: from, lt: to } },
      include: {
        items: true,
        customer: { include: { assignedTo: { include: { role: true } } } },
      },
    });

    const created: string[] = [];
    let skipped = 0;

    for (const invoice of invoices) {
      const beneficiary = invoice.customer.assignedTo;
      if (!beneficiary) {
        skipped += 1;
        continue;
      }

      const plan = this.resolvePlan(plans, beneficiary.id, beneficiary.role?.name);
      if (!plan) {
        skipped += 1;
        continue;
      }

      const baseAmount = this.baseAmountFor(plan.base, invoice);

      if (plan.minimumAmount && baseAmount < Number(plan.minimumAmount)) {
        skipped += 1;
        continue;
      }

      let amount = baseAmount * Number(plan.rate);
      if (plan.capAmount) amount = Math.min(amount, Number(plan.capAmount));

      // `skipDuplicates` n'existe pas sur create : on s'appuie sur la
      // contrainte d'unicité et on ignore le conflit.
      try {
        const commission = await this.prisma.commission.create({
          data: {
            userId: beneficiary.id,
            planId: plan.id,
            sourceType: 'INVOICE',
            sourceId: invoice.id,
            baseAmount: new Prisma.Decimal(baseAmount.toFixed(2)),
            rate: plan.rate,
            amount: new Prisma.Decimal(amount.toFixed(2)),
            period,
          },
        });
        created.push(commission.id);
      } catch {
        skipped += 1;
      }
    }

    await this.audit.create({
      action: 'CREATE',
      entity: 'Commission',
      description: `Calcul des commissions ${period} : ${created.length} ligne(s) créée(s)`,
      userId: actorId,
    });

    return {
      period,
      invoicesExamined: invoices.length,
      created: created.length,
      skipped,
    };
  }

  /**
   * Le barème nominatif prime sur celui du rôle : c'est ce qui permet
   * d'accorder un traitement particulier sans dupliquer toute la grille.
   */
  private resolvePlan(
    plans: (Prisma.CommissionPlanGetPayload<{ include: { role: { select: { name: true } } } }>)[],
    userId: string,
    roleName?: string,
  ) {
    return (
      plans.find((plan) => plan.userId === userId) ??
      plans.find((plan) => plan.role?.name === roleName) ??
      plans.find((plan) => !plan.userId && !plan.roleId)
    );
  }

  /** Assiette retenue selon le barème. */
  private baseAmountFor(
    base: CommissionBase,
    invoice: Prisma.InvoiceGetPayload<{ include: { items: true } }>,
  ): number {
    if (base === CommissionBase.MARGIN) {
      // `Product` ne porte pas de coût de revient dans le schéma actuel : la
      // marge n'est donc pas calculable. On refuse plutôt que de retomber
      // silencieusement sur le chiffre d'affaires, ce qui gonflerait les
      // commissions sans que personne ne s'en aperçoive.
      throw new BadRequestException(
        'L’assiette « marge » suppose un coût de revient sur les produits, absent du catalogue. ' +
          'Choisissez « montant signé » ou « montant encaissé ».',
      );
    }

    // SIGNED_AMOUNT et COLLECTED_AMOUNT se confondent ici puisque le calcul
    // ne retient que les factures déjà réglées.
    return Number(invoice.subtotal);
  }

  // -------------------------------------------------------------------------
  // Consultation et cycle de vie
  // -------------------------------------------------------------------------

  async findAll(filters: { period?: string; userId?: string; status?: CommissionStatus }) {
    const where = {
      ...(filters.period ? { period: filters.period } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [data, aggregate] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        include: { user: { select: BENEFICIARY_SELECT }, plan: { select: { name: true } } },
        orderBy: [{ period: 'desc' }, { amount: 'desc' }],
      }),
      this.prisma.commission.aggregate({ where, _sum: { amount: true }, _count: { _all: true } }),
    ]);

    return {
      data,
      total: aggregate._count._all,
      totalAmount: Number(aggregate._sum.amount ?? 0),
    };
  }

  /** Synthèse par commercial sur une période — la vue de validation. */
  async summary(period: string) {
    const rows = await this.prisma.commission.groupBy({
      by: ['userId', 'status'],
      where: { period },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.userId))] } },
      select: BENEFICIARY_SELECT,
    });

    return users.map((user) => {
      const own = rows.filter((r) => r.userId === user.id);

      return {
        user,
        lines: own.reduce((sum, r) => sum + r._count._all, 0),
        total: own.reduce((sum, r) => sum + Number(r._sum.amount ?? 0), 0),
        byStatus: Object.fromEntries(
          own.map((r) => [r.status, Number(r._sum.amount ?? 0)]),
        ),
      };
    });
  }

  /**
   * Validation en masse d'une période. Seules les lignes en attente sont
   * touchées : revalider ne réécrit pas une ligne déjà payée.
   */
  async approve(period: string, actorId: string, userId?: string) {
    const result = await this.prisma.commission.updateMany({
      where: { period, status: CommissionStatus.PENDING, ...(userId ? { userId } : {}) },
      data: { status: CommissionStatus.APPROVED, approvedAt: new Date() },
    });

    await this.audit.create({
      action: 'UPDATE',
      entity: 'Commission',
      description: `Validation des commissions ${period} : ${result.count} ligne(s)`,
      userId: actorId,
    });

    return { approved: result.count };
  }

  async markPaid(period: string, actorId: string, userId?: string) {
    const result = await this.prisma.commission.updateMany({
      where: { period, status: CommissionStatus.APPROVED, ...(userId ? { userId } : {}) },
      data: { status: CommissionStatus.PAID, paidAt: new Date() },
    });

    await this.audit.create({
      action: 'UPDATE',
      entity: 'Commission',
      description: `Mise en paiement des commissions ${period} : ${result.count} ligne(s)`,
      userId: actorId,
    });

    return { paid: result.count };
  }

  async cancel(id: string, reason: string | undefined, actorId: string) {
    const commission = await this.prisma.commission.findUnique({ where: { id } });
    if (!commission) throw new NotFoundException('Commission introuvable.');

    if (commission.status === CommissionStatus.PAID) {
      throw new BadRequestException(
        'Une commission déjà payée ne peut être annulée : passez par une régularisation.',
      );
    }

    const cancelled = await this.prisma.commission.update({
      where: { id },
      data: { status: CommissionStatus.CANCELLED, notes: reason ?? null },
    });

    await this.audit.create({
      action: 'UPDATE',
      entity: 'Commission',
      entityId: id,
      description: `Commission annulée${reason ? ` — ${reason}` : ''}`,
      userId: actorId,
    });

    return cancelled;
  }

  /** Ce que le commercial connecté voit de ses propres commissions. */
  mine(userId: string) {
    return this.prisma.commission.findMany({
      where: { userId, status: { not: CommissionStatus.CANCELLED } },
      include: { plan: { select: { name: true } } },
      orderBy: { period: 'desc' },
      take: 100,
    });
  }
}
