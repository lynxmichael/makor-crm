import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import {
  InvoiceStatus,
  PaymentStatus,
  QuoteStatus,
  PurchaseOrderStatus,
  ActivityType,
} from '@prisma/client';

export interface DashboardFilters {
  from?: string;
  to?: string;
  country?: string;
  sector?: string;
  productId?: string;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  private period(filters: DashboardFilters) {
    if (!filters.from && !filters.to) return undefined;
    return {
      gte: filters.from ? new Date(filters.from) : undefined,
      lte: filters.to ? new Date(filters.to) : undefined,
    };
  }

  private customerFilter(filters: DashboardFilters) {
    const where: Record<string, unknown> = {};
    if (filters.country) where.country = filters.country;
    if (filters.sector) where.sector = filters.sector;
    return where;
  }

  /** Marge (CA - coût) calculée à partir des lignes de facture, en
   * s'appuyant sur la grille tarifaire produit/pays/secteur (CDC §4.5,
   * §9). Approximation : à défaut de tarif spécifique pays/secteur, on
   * retient le tarif générique du produit s'il existe. */
  private async computeInvoiceMargin(period?: {
    gte?: Date;
    lte?: Date;
  }) {
    const items = await this.prisma.invoiceItem.findMany({
      where: period ? { invoice: { issuedAt: period } } : undefined,
      include: {
        product: { include: { pricingGrid: true } },
        invoice: { include: { customer: true } },
      },
    });

    let revenue = 0;
    let cost = 0;

    for (const item of items) {
      const lineTotal = Number(item.total);
      revenue += lineTotal;

      if (!item.product) continue;

      const customer = item.invoice.customer;
      const grid = item.product.pricingGrid.find(
        (p) => p.country === customer.country && p.sector === customer.sector,
      ) ??
        item.product.pricingGrid.find(
          (p) => p.country === customer.country && !p.sector,
        ) ??
        item.product.pricingGrid.find((p) => !p.country && !p.sector);

      if (grid) {
        cost += Number(grid.unitCost) * item.quantity;
      }
    }

    return { revenue, cost, margin: revenue - cost };
  }

  private async conversionAndCycle(period?: { gte?: Date; lte?: Date }) {
    const deals = await this.prisma.deal.findMany({
      where: period ? { createdAt: period } : undefined,
      include: { stage: true, stageHistory: { orderBy: { createdAt: 'asc' } } },
    });

    const total = deals.length;
    const won = deals.filter((d) => d.stage.isClosedWon);
    const lost = deals.filter((d) => d.stage.isClosedLost);

    const cycleDurations = won
      .map((d) => {
        const firstMove = d.stageHistory[0];
        if (!firstMove) return null;
        const days =
          (d.updatedAt.getTime() - d.createdAt.getTime()) / 86_400_000;
        return days;
      })
      .filter((v): v is number => v !== null);

    const avgCycleDays = cycleDurations.length
      ? cycleDurations.reduce((a, b) => a + b, 0) / cycleDurations.length
      : 0;

    const avgDealSize = total
      ? deals.reduce((sum, d) => sum + Number(d.amount), 0) / total
      : 0;

    return {
      totalDeals: total,
      wonDeals: won.length,
      lostDeals: lost.length,
      conversionRate: total ? won.length / total : 0,
      averageDealSize: Math.round(avgDealSize),
      averageSalesCycleDays: Math.round(avgCycleDays * 10) / 10,
    };
  }

  // -------------------------------------------------------------------
  // Super Admin (CDC §4.1) : vue globale consolidée, tous profils,
  // filtrable par période / pays / produit / secteur, taux de
  // transformation par commercial, taille des opportunités.
  // -------------------------------------------------------------------

  async superAdmin(filters: DashboardFilters = {}) {
    const createdAt = this.period(filters);

    const [
      totalUsers,
      totalCustomers,
      totalLeads,
      totalDeals,
      totalQuotes,
      totalPurchaseOrders,
      totalContracts,
      totalCampaigns,
      margin,
      pipeline,
      byCommercialRaw,
      wonByCommercialRaw,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.customer.count({ where: this.customerFilter(filters) }),
      this.prisma.lead.count({ where: createdAt ? { createdAt } : undefined }),
      this.prisma.deal.count({ where: createdAt ? { createdAt } : undefined }),
      this.prisma.quote.count({ where: createdAt ? { createdAt } : undefined }),
      this.prisma.purchaseOrder.count({
        where: createdAt ? { createdAt } : undefined,
      }),
      this.prisma.contract.count({
        where: createdAt ? { createdAt } : undefined,
      }),
      this.prisma.campaign.count({
        where: createdAt ? { createdAt } : undefined,
      }),
      this.computeInvoiceMargin(createdAt),
      this.conversionAndCycle(createdAt),
      this.prisma.deal.groupBy({
        by: ['assignedToId'],
        _count: { _all: true },
        where: createdAt ? { createdAt } : undefined,
      }),
      this.prisma.deal.groupBy({
        by: ['assignedToId'],
        _count: { _all: true },
        where: {
          ...(createdAt ? { createdAt } : {}),
          stage: { isClosedWon: true },
        },
      }),
    ]);

    const users = await this.prisma.user.findMany({
      where: { id: { in: byCommercialRaw.map((r) => r.assignedToId) } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const wonMap = new Map(
      wonByCommercialRaw.map((r) => [r.assignedToId, r._count._all]),
    );

    const transformationByCommercial = byCommercialRaw.map((r) => {
      const total = r._count._all;
      const won = wonMap.get(r.assignedToId) ?? 0;
      const user = userMap.get(r.assignedToId);

      return {
        userId: r.assignedToId,
        name: user ? `${user.firstName} ${user.lastName}` : 'Inconnu',
        totalDeals: total,
        wonDeals: won,
        transformationRate: total ? won / total : 0,
      };
    });

    return {
      totals: {
        activeUsers: totalUsers,
        customers: totalCustomers,
        leads: totalLeads,
        deals: totalDeals,
        quotes: totalQuotes,
        purchaseOrders: totalPurchaseOrders,
        contracts: totalContracts,
        campaigns: totalCampaigns,
      },
      revenue: margin,
      pipeline,
      transformationByCommercial,
    };
  }

  // -------------------------------------------------------------------
  // Admin ventes (CDC §4.1) : volumes, marges, CA, qualité du pipeline
  // -------------------------------------------------------------------

  async salesAdmin(filters: DashboardFilters = {}) {
    const period = this.period(filters);

    const [margin, pipeline, volumeByCampaign, quoteSignatureRate] =
      await Promise.all([
        this.computeInvoiceMargin(period),
        this.conversionAndCycle(period),
        this.prisma.campaignRecipient.groupBy({
          by: ['status'],
          _count: { _all: true },
          where: period ? { createdAt: period } : undefined,
        }),
        this.quoteSignatureRate(period),
      ]);

    return {
      revenue: margin,
      pipelineQuality: pipeline,
      campaignVolumeByStatus: volumeByCampaign.map((v) => ({
        status: v.status,
        count: v._count._all,
      })),
      quoteSignatureRate,
    };
  }

  private async quoteSignatureRate(period?: { gte?: Date; lte?: Date }) {
    const [sent, accepted] = await Promise.all([
      this.prisma.quote.count({
        where: {
          status: { in: [QuoteStatus.SENT, QuoteStatus.ACCEPTED, QuoteStatus.REJECTED] },
          ...(period ? { createdAt: period } : {}),
        },
      }),
      this.prisma.quote.count({
        where: {
          status: QuoteStatus.ACCEPTED,
          ...(period ? { createdAt: period } : {}),
        },
      }),
    ]);

    return { sent, accepted, rate: sent ? accepted / sent : 0 };
  }

  // -------------------------------------------------------------------
  // Superviseur (CDC §4.1) : statistiques par période et par commercial
  // -------------------------------------------------------------------

  async supervisor(filters: DashboardFilters = {}, departmentId?: string) {
    const period = this.period(filters);

    const teamWhere = departmentId ? { departmentId } : {};

    const commercials = await this.prisma.user.findMany({
      where: { ...teamWhere, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });

    const ids = commercials.map((c) => c.id);

    const [rdv, proposals, purchaseOrders, sales] = await Promise.all([
      this.prisma.activity.groupBy({
        by: ['assignedToId'],
        _count: { _all: true },
        where: {
          assignedToId: { in: ids },
          type: ActivityType.MEETING,
          ...(period ? { createdAt: period } : {}),
        },
      }),
      this.prisma.quote.groupBy({
        by: ['createdById'],
        _count: { _all: true },
        where: {
          createdById: { in: ids },
          ...(period ? { createdAt: period } : {}),
        },
      }),
      this.prisma.purchaseOrder.groupBy({
        by: ['createdById'],
        _count: { _all: true },
        where: {
          createdById: { in: ids },
          ...(period ? { createdAt: period } : {}),
        },
      }),
      this.prisma.deal.groupBy({
        by: ['assignedToId'],
        _count: { _all: true },
        _sum: { amount: true },
        where: {
          assignedToId: { in: ids },
          stage: { isClosedWon: true },
          ...(period ? { createdAt: period } : {}),
        },
      }),
    ]);

    const toMap = (rows: any[], key: string) =>
      new Map(rows.map((r) => [r[key], r]));

    const rdvMap = toMap(rdv, 'assignedToId');
    const proposalsMap = toMap(proposals, 'createdById');
    const poMap = toMap(purchaseOrders, 'createdById');
    const salesMap = toMap(sales, 'assignedToId');

    return commercials.map((c) => ({
      userId: c.id,
      name: `${c.firstName} ${c.lastName}`,
      meetings: rdvMap.get(c.id)?._count._all ?? 0,
      proposals: proposalsMap.get(c.id)?._count._all ?? 0,
      purchaseOrders: poMap.get(c.id)?._count._all ?? 0,
      sales: salesMap.get(c.id)?._count._all ?? 0,
      salesValue: Number(salesMap.get(c.id)?._sum.amount ?? 0),
    }));
  }

  // -------------------------------------------------------------------
  // Commercial (CDC §4.1) : portefeuille, pipeline et agenda personnels
  // -------------------------------------------------------------------

  async myPortfolio(userId: string) {
    const [customers, deals, upcomingActivities, quotes] = await Promise.all([
      this.prisma.customer.count({ where: { assignedToId: userId } }),

      this.prisma.deal.findMany({
        where: { assignedToId: userId },
        include: { stage: true, customer: true, lead: true },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),

      this.prisma.activity.findMany({
        where: {
          assignedToId: userId,
          status: { in: ['PLANNED', 'IN_PROGRESS'] },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),

      this.prisma.quote.count({ where: { createdById: userId } }),
    ]);

    return {
      customersCount: customers,
      openDeals: deals.filter((d) => !d.stage.isClosedWon && !d.stage.isClosedLost),
      wonDeals: deals.filter((d) => d.stage.isClosedWon),
      upcomingActivities,
      quotesCreated: quotes,
    };
  }

  // -------------------------------------------------------------------
  // Manager (CDC §4.1) : factures envoyées et encaissements
  // -------------------------------------------------------------------

  async manager(filters: DashboardFilters = {}) {
    const period = this.period(filters);

    const [sentInvoices, paidInvoices, payments, overdue] = await Promise.all([
      this.prisma.invoice.aggregate({
        _count: { _all: true },
        _sum: { total: true },
        where: {
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.PAID] },
          ...(period ? { issuedAt: period } : {}),
        },
      }),

      this.prisma.invoice.findMany({
        where: {
          status: InvoiceStatus.PAID,
          ...(period ? { issuedAt: period } : {}),
        },
        include: { payments: { where: { status: PaymentStatus.SUCCESS } } },
      }),

      this.prisma.payment.aggregate({
        _count: { _all: true },
        _sum: { amount: true },
        where: {
          status: PaymentStatus.SUCCESS,
          ...(period ? { paidAt: period } : {}),
        },
      }),

      this.prisma.invoice.count({
        where: {
          status: InvoiceStatus.SENT,
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    const delays = paidInvoices
      .flatMap((inv) =>
        inv.payments.map((p) =>
          p.paidAt
            ? (p.paidAt.getTime() - inv.issuedAt.getTime()) / 86_400_000
            : null,
        ),
      )
      .filter((v): v is number => v !== null);

    const averagePaymentDelayDays = delays.length
      ? Math.round(
          (delays.reduce((a, b) => a + b, 0) / delays.length) * 10,
        ) / 10
      : 0;

    return {
      invoicesSent: sentInvoices._count._all,
      invoicesSentAmount: Number(sentInvoices._sum.total ?? 0),
      paymentsReceived: payments._count._all,
      paymentsReceivedAmount: Number(payments._sum.amount ?? 0),
      overdueInvoices: overdue,
      averagePaymentDelayDays,
    };
  }
}
