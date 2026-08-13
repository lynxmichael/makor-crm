import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export type InstallmentState = 'PAID' | 'PARTIAL' | 'DUE' | 'OVERDUE' | 'UPCOMING';

@Injectable()
export class InstallmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Génère un échéancier en parts régulières.
   *
   * Le reliquat de division est reporté sur la PREMIÈRE échéance et non sur la
   * dernière : mieux vaut encaisser le centime supplémentaire tout de suite que
   * de le réclamer des mois plus tard, et la somme des échéances tombe juste
   * au franc près.
   */
  async generate(
    invoiceId: string,
    params: { count: number; everyDays?: number; firstDueDate?: Date; downPayment?: number },
    actorId?: string,
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, installments: true },
    });

    if (!invoice) throw new NotFoundException('Facture introuvable.');

    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException("Une facture annulée ne peut pas être échelonnée.");
    }

    const count = Math.floor(params.count);

    if (!Number.isFinite(count) || count < 2 || count > 36) {
      throw new BadRequestException(
        'Le nombre d’échéances doit être compris entre 2 et 36. En dessous, il n’y a pas d’échelonnement.',
      );
    }

    const settled = invoice.payments
      .filter((p) => p.status === PaymentStatus.SUCCESS)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const total = Number(invoice.total);

    if (settled >= total) {
      throw new BadRequestException('Cette facture est déjà soldée.');
    }

    const everyDays = params.everyDays && params.everyDays > 0 ? params.everyDays : 30;
    const start = params.firstDueDate ?? invoice.dueDate ?? new Date();

    // Un acompte n'est pas une échéance comme les autres : il est dû
    // immédiatement, et le reste se répartit sur les échéances suivantes.
    const downPayment = params.downPayment && params.downPayment > 0 ? params.downPayment : 0;

    if (downPayment >= total) {
      throw new BadRequestException("L'acompte ne peut pas couvrir la totalité de la facture.");
    }

    const remaining = total - downPayment;
    const slots = downPayment > 0 ? count - 1 : count;

    // Centimes, pour éviter les dérives de l'arithmétique flottante.
    const cents = Math.round(remaining * 100);
    const base = Math.floor(cents / slots);
    const leftover = cents - base * slots;

    const rows: Prisma.InvoiceInstallmentCreateManyInput[] = [];
    let sequence = 1;

    if (downPayment > 0) {
      rows.push({
        invoiceId,
        sequence: sequence++,
        amount: new Prisma.Decimal(downPayment.toFixed(2)),
        dueDate: start,
        label: 'Acompte',
      });
    }

    for (let i = 0; i < slots; i += 1) {
      const amount = (base + (i === 0 ? leftover : 0)) / 100;
      const dueDate = new Date(start);
      dueDate.setDate(dueDate.getDate() + everyDays * (downPayment > 0 ? i + 1 : i));

      rows.push({
        invoiceId,
        sequence: sequence++,
        amount: new Prisma.Decimal(amount.toFixed(2)),
        dueDate,
        label: `Échéance ${i + 1} sur ${slots}`,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      // Remplacement complet : un échéancier partiellement réécrit ne
      // totaliserait plus le montant de la facture.
      await tx.invoiceInstallment.deleteMany({ where: { invoiceId } });
      await tx.invoiceInstallment.createMany({ data: rows });
    });

    await this.audit.create({
      action: 'UPDATE',
      entity: 'Invoice',
      entityId: invoiceId,
      description: `Échéancier en ${rows.length} versements créé sur la facture ${invoice.number}`,
      userId: actorId,
    });

    return this.schedule(invoiceId);
  }

  /** Supprime le plan sans toucher aux versements déjà enregistrés. */
  async clear(invoiceId: string, actorId?: string) {
    await this.prisma.invoiceInstallment.deleteMany({ where: { invoiceId } });

    await this.audit.create({
      action: 'UPDATE',
      entity: 'Invoice',
      entityId: invoiceId,
      description: 'Échéancier supprimé',
      userId: actorId,
    });

    return this.schedule(invoiceId);
  }

  /**
   * État de l'échéancier, versements imputés.
   *
   * L'imputation se fait des échéances les plus anciennes vers les plus
   * récentes : c'est la règle usuelle, et elle évite qu'un versement destiné
   * au solde masque un impayé ancien.
   */
  async schedule(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
        installments: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!invoice) throw new NotFoundException('Facture introuvable.');

    const total = Number(invoice.total);

    const successful = invoice.payments.filter((p) => p.status === PaymentStatus.SUCCESS);
    const settled = successful.reduce((sum, p) => sum + Number(p.amount), 0);

    let credit = settled;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const installments = invoice.installments.map((row) => {
      const amount = Number(row.amount);
      const paid = Math.min(credit, amount);
      credit -= paid;

      const outstanding = amount - paid;
      const due = new Date(row.dueDate);

      let state: InstallmentState;
      if (outstanding <= 0) state = 'PAID';
      else if (due < today) state = paid > 0 ? 'OVERDUE' : 'OVERDUE';
      else if (paid > 0) state = 'PARTIAL';
      else state = due.toDateString() === today.toDateString() ? 'DUE' : 'UPCOMING';

      return {
        id: row.id,
        sequence: row.sequence,
        label: row.label,
        dueDate: row.dueDate,
        amount,
        paid,
        outstanding,
        state,
        daysLate:
          outstanding > 0 && due < today
            ? Math.floor((today.getTime() - due.getTime()) / 86_400_000)
            : 0,
      };
    });

    const overdue = installments.filter((i) => i.state === 'OVERDUE');

    return {
      invoice: { id: invoice.id, number: invoice.number, total, dueDate: invoice.dueDate },
      hasSchedule: installments.length > 0,
      installments,
      summary: {
        total,
        settled,
        outstanding: Math.max(0, total - settled),
        // Le nombre de fois demandé : versements constatés, pas échéances.
        paymentsCount: successful.length,
        installmentsCount: installments.length,
        installmentsPaid: installments.filter((i) => i.state === 'PAID').length,
        overdueCount: overdue.length,
        overdueAmount: overdue.reduce((sum, i) => sum + i.outstanding, 0),
        /** Prochaine échéance non soldée — ce qu'on relance en premier. */
        nextDue: installments.find((i) => i.outstanding > 0) ?? null,
      },
    };
  }
}
