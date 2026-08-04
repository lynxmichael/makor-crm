import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityStatus, InvoiceStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OverdueWatcherService {
  private readonly logger = new Logger(OverdueWatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Deux des seize déclencheurs de workflow ne correspondent à aucune action :
   * un retard ne survient pas, il se constate. Il faut donc aller le chercher.
   *
   * Une passe quotidienne suffit — un retard de paiement se joue en jours, pas
   * en minutes, et interroger la base toutes les cinq minutes ne changerait
   * rien à ce que le Financier fait de l'information.
   */
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async detectOverdue(): Promise<void> {
    await Promise.all([this.overdueInvoices(), this.overdueActivities()]);
  }

  /**
   * Factures échues et non réglées.
   *
   * `notifiedOverdueAt` évite de réémettre chaque matin pour la même facture :
   * sans cette marque, une facture impayée depuis trois mois déclencherait
   * quatre-vingt-dix alertes et les rendrait toutes inaudibles.
   */
  private async overdueInvoices(): Promise<void> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.SENT,
        dueDate: { lt: new Date() },
        notifiedOverdueAt: null,
      },
      include: { customer: { select: { companyName: true, assignedToId: true } } },
      take: 200,
    });

    for (const invoice of invoices) {
      this.events.emit('workflow.trigger', {
        trigger: 'INVOICE_OVERDUE',
        entityType: 'INVOICE',
        entityId: invoice.id,
        actorId: invoice.customer.assignedToId ?? undefined,
        payload: {
          number: invoice.number,
          total: Number(invoice.total),
          dueDate: invoice.dueDate,
          daysLate: invoice.dueDate
            ? Math.floor((Date.now() - invoice.dueDate.getTime()) / 86_400_000)
            : 0,
          customerName: invoice.customer.companyName,
        },
      });
    }

    if (invoices.length) {
      await this.prisma.invoice.updateMany({
        where: { id: { in: invoices.map((i) => i.id) } },
        data: { notifiedOverdueAt: new Date() },
      });

      this.logger.log(`${invoices.length} facture(s) en retard signalée(s).`);
    }
  }

  /** Rendez-vous et tâches dont l'échéance est passée sans avoir été traités. */
  private async overdueActivities(): Promise<void> {
    const activities = await this.prisma.activity.findMany({
      where: {
        status: { in: [ActivityStatus.PLANNED, ActivityStatus.IN_PROGRESS] },
        dueDate: { lt: new Date() },
        notifiedOverdueAt: null,
      },
      include: { customer: { select: { companyName: true } } },
      take: 200,
    });

    for (const activity of activities) {
      this.events.emit('workflow.trigger', {
        trigger: 'ACTIVITY_OVERDUE',
        entityType: 'ACTIVITY',
        entityId: activity.id,
        actorId: activity.assignedToId,
        payload: {
          title: activity.title,
          type: activity.type,
          dueDate: activity.dueDate,
          customerName: activity.customer?.companyName,
        },
      });
    }

    if (activities.length) {
      await this.prisma.activity.updateMany({
        where: { id: { in: activities.map((a) => a.id) } },
        data: { notifiedOverdueAt: new Date() },
      });

      this.logger.log(`${activities.length} activité(s) en retard signalée(s).`);
    }
  }
}
