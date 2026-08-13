import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseCategory, ExpenseStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  role: { select: { name: true, label: true } },
} as const;

const REVIEWER_SELECT = { id: true, firstName: true, lastName: true } as const;

/** Profils habilités à voir et valider les frais de toute l'équipe. */
const REVIEWER_ROLES = ['SUPER_ADMIN', 'ADMIN_VENTES'];

export interface Actor {
  id: string;
  role?: { name?: string };
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private isReviewer(actor: Actor): boolean {
    return REVIEWER_ROLES.includes(actor?.role?.name ?? '');
  }

  /**
   * Périmètre de lecture.
   *
   * Une note de frais dit où un commercial est allé, chez qui et combien il a
   * dépensé : c'est une information personnelle autant que comptable. Seuls
   * son auteur, le Super Admin et l'Admin ventes y ont accès — pas même le
   * superviseur, qui encadre l'activité et non les remboursements.
   */
  private scope(actor: Actor): Prisma.ExpenseWhereInput {
    return this.isReviewer(actor) ? {} : { userId: actor.id };
  }

  async findAll(
    actor: Actor,
    filters: {
      status?: ExpenseStatus;
      category?: ExpenseCategory;
      userId?: string;
      from?: Date;
      to?: Date;
      search?: string;
    } = {},
  ) {
    const where: Prisma.ExpenseWhereInput = {
      ...this.scope(actor),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      // Le filtre par auteur n'est offert qu'aux valideurs : pour les autres,
      // le périmètre l'a déjà fixé et ne doit pas pouvoir être élargi.
      ...(filters.userId && this.isReviewer(actor) ? { userId: filters.userId } : {}),
      ...(filters.from || filters.to
        ? {
            spentAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { label: { contains: filters.search, mode: 'insensitive' as const } },
              {
                customer: {
                  companyName: { contains: filters.search, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };

    const [data, byCategory] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          user: { select: AUTHOR_SELECT },
          reviewedBy: { select: REVIEWER_SELECT },
          customer: { select: { id: true, companyName: true } },
        },
        orderBy: { spentAt: 'desc' },
        take: 300,
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        // Les notes refusées n'entrent dans aucun total : elles ne
        // correspondent à aucune dépense engagée par l'entreprise.
        where: { ...where, status: { not: ExpenseStatus.REJECTED } },
        _sum: { amount: true },
      }),
    ]);

    const totals = await this.totals(where);

    return {
      data,
      totals,
      byCategory: byCategory
        .map((row) => ({ category: row.category, amount: Number(row._sum.amount ?? 0) }))
        .sort((a, b) => b.amount - a.amount),
    };
  }

  private async totals(where: Prisma.ExpenseWhereInput) {
    const [engaged, pending, reimbursed, approved] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { ...where, status: { not: ExpenseStatus.REJECTED } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { ...where, status: ExpenseStatus.PENDING },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.expense.aggregate({
        where: { ...where, status: ExpenseStatus.REIMBURSED },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { ...where, status: ExpenseStatus.APPROVED },
        _sum: { amount: true },
      }),
    ]);

    return {
      engaged: Number(engaged._sum.amount ?? 0),
      pending: Number(pending._sum.amount ?? 0),
      pendingCount: pending._count._all,
      reimbursed: Number(reimbursed._sum.amount ?? 0),
      // Validé mais pas encore versé : ce que l'entreprise doit réellement.
      outstanding: Number(approved._sum.amount ?? 0),
    };
  }

  /** Une note se dépose toujours pour soi-même. */
  async create(
    actor: Actor,
    dto: {
      category: ExpenseCategory;
      label: string;
      amount: number;
      spentAt: Date;
      customerId?: string;
      notes?: string;
      receiptPath?: string;
    },
  ) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à zéro.');
    }

    const expense = await this.prisma.expense.create({
      data: {
        userId: actor.id,
        category: dto.category,
        label: dto.label.trim(),
        amount: new Prisma.Decimal(dto.amount.toFixed(2)),
        spentAt: dto.spentAt,
        customerId: dto.customerId || null,
        notes: dto.notes?.trim() || null,
        receiptPath: dto.receiptPath || null,
      },
      include: {
        user: { select: AUTHOR_SELECT },
        customer: { select: { id: true, companyName: true } },
      },
    });

    await this.audit.create({
      action: 'CREATE',
      entity: 'Expense',
      entityId: expense.id,
      description: `Note de frais « ${dto.label.trim()} » de ${dto.amount.toFixed(2)} déposée`,
      userId: actor.id,
    });

    return expense;
  }

  /**
   * Modification par l'auteur, tant que la note n'est pas traitée.
   *
   * Une note validée n'est plus modifiable : elle engage un remboursement, et
   * pouvoir en changer le montant après coup viderait la validation de son
   * sens.
   */
  async update(
    id: string,
    actor: Actor,
    dto: Partial<{
      category: ExpenseCategory;
      label: string;
      amount: number;
      spentAt: Date;
      customerId: string;
      notes: string;
      receiptPath: string;
    }>,
  ) {
    const expense = await this.findOneOrFail(id, actor);

    if (expense.userId !== actor.id) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres notes de frais.');
    }

    if (expense.status !== ExpenseStatus.PENDING) {
      throw new BadRequestException(
        'Cette note a déjà été traitée. Demandez sa réouverture à un administrateur.',
      );
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.label ? { label: dto.label.trim() } : {}),
        ...(dto.amount !== undefined
          ? { amount: new Prisma.Decimal(dto.amount.toFixed(2)) }
          : {}),
        ...(dto.spentAt ? { spentAt: dto.spentAt } : {}),
        ...(dto.customerId !== undefined ? { customerId: dto.customerId || null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        ...(dto.receiptPath !== undefined ? { receiptPath: dto.receiptPath || null } : {}),
      },
      include: {
        user: { select: AUTHOR_SELECT },
        customer: { select: { id: true, companyName: true } },
      },
    });
  }

  async approve(id: string, actor: Actor) {
    const expense = await this.findOneOrFail(id, actor);

    if (expense.status !== ExpenseStatus.PENDING) {
      throw new BadRequestException('Seule une note en attente peut être validée.');
    }

    // Un valideur ne se valide pas lui-même : sur une dépense d'entreprise,
    // c'est le principe même du contrôle.
    if (expense.userId === actor.id) {
      throw new ForbiddenException(
        'Vous ne pouvez pas valider votre propre note de frais. Un autre administrateur doit le faire.',
      );
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.APPROVED,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
      include: {
        user: { select: AUTHOR_SELECT },
        reviewedBy: { select: REVIEWER_SELECT },
        customer: { select: { id: true, companyName: true } },
      },
    });

    await this.audit.create({
      action: 'UPDATE',
      entity: 'Expense',
      entityId: id,
      description: `Note de frais de ${Number(expense.amount).toFixed(2)} validée`,
      userId: actor.id,
    });

    return updated;
  }

  async reject(id: string, actor: Actor, rejectionReason: string) {
    const expense = await this.findOneOrFail(id, actor);

    if (expense.status !== ExpenseStatus.PENDING) {
      throw new BadRequestException('Seule une note en attente peut être refusée.');
    }

    if (!rejectionReason?.trim() || rejectionReason.trim().length < 5) {
      throw new BadRequestException(
        'Un refus doit être motivé : sans explication, la même note reviendra.',
      );
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.REJECTED,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason.trim(),
      },
      include: {
        user: { select: AUTHOR_SELECT },
        reviewedBy: { select: REVIEWER_SELECT },
        customer: { select: { id: true, companyName: true } },
      },
    });

    await this.audit.create({
      action: 'UPDATE',
      entity: 'Expense',
      entityId: id,
      description: `Note de frais refusée — ${rejectionReason.trim()}`,
      userId: actor.id,
    });

    return updated;
  }

  async reimburse(id: string, actor: Actor, payload: { method?: string; reference?: string }) {
    const expense = await this.findOneOrFail(id, actor);

    if (expense.status !== ExpenseStatus.APPROVED) {
      throw new BadRequestException(
        'Seule une note validée peut être remboursée. Validez-la d’abord.',
      );
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.REIMBURSED,
        reimbursedAt: new Date(),
        method: payload.method ?? null,
        reference: payload.reference ?? null,
      },
      include: {
        user: { select: AUTHOR_SELECT },
        reviewedBy: { select: REVIEWER_SELECT },
        customer: { select: { id: true, companyName: true } },
      },
    });

    await this.audit.create({
      action: 'UPDATE',
      entity: 'Expense',
      entityId: id,
      description: `Note de frais de ${Number(expense.amount).toFixed(2)} remboursée`,
      userId: actor.id,
    });

    return updated;
  }

  /** L'auteur retire sa note tant qu'elle n'a pas été traitée. */
  async remove(id: string, actor: Actor) {
    const expense = await this.findOneOrFail(id, actor);

    const isOwnerPending =
      expense.userId === actor.id && expense.status === ExpenseStatus.PENDING;

    if (!isOwnerPending && !this.isReviewer(actor)) {
      throw new ForbiddenException(
        'Seul l’auteur peut supprimer sa note, et seulement tant qu’elle est en attente.',
      );
    }

    if (expense.status === ExpenseStatus.REIMBURSED) {
      throw new BadRequestException(
        'Une note déjà remboursée ne peut pas être supprimée : elle appartient à la comptabilité.',
      );
    }

    await this.prisma.expense.delete({ where: { id } });

    await this.audit.create({
      action: 'DELETE',
      entity: 'Expense',
      entityId: id,
      description: `Note de frais de ${Number(expense.amount).toFixed(2)} supprimée`,
      userId: actor.id,
    });

    return { id };
  }

  /**
   * Lecture unitaire avec périmètre.
   *
   * Une note hors périmètre renvoie 404 et non 403 : répondre « interdit »
   * confirmerait qu'elle existe, et donc qu'un collègue a engagé une dépense.
   */
  private async findOneOrFail(id: string, actor: Actor) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, ...this.scope(actor) },
    });

    if (!expense) throw new NotFoundException('Note de frais introuvable.');
    return expense;
  }
}
