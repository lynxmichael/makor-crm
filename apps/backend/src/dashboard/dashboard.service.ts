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

    const commissionsByCommercial = await this.commissionsByCommercial();

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
      commissionsByCommercial,
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

    // Un superviseur encadre des commerciaux. Sans ce filtre de rôle, la
    // requête ramenait TOUS les comptes actifs — Super Admin, Admin ventes et
    // Financier compris — et exposait leur activité dans son tableau de bord.
    const commercials = await this.prisma.user.findMany({
      where: {
        ...teamWhere,
        isActive: true,
        role: { name: 'COMMERCIAL' },
      },
      select: { id: true, firstName: true, lastName: true, avatar: true },
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

    const team = commercials.map((c) => {
      const meetings = rdvMap.get(c.id)?._count._all ?? 0;
      const proposals = proposalsMap.get(c.id)?._count._all ?? 0;
      const purchaseOrders = poMap.get(c.id)?._count._all ?? 0;
      const sales = salesMap.get(c.id)?._count._all ?? 0;

      return {
        userId: c.id,
        name: `${c.firstName} ${c.lastName}`,
        firstName: c.firstName,
        lastName: c.lastName,
        avatar: c.avatar,
        meetings,
        proposals,
        purchaseOrders,
        sales,
        salesValue: Number(salesMap.get(c.id)?._sum.amount ?? 0),
        // Taux de transformation du rendez-vous à la vente : c'est lui qui
        // distingue un commercial efficace d'un commercial occupé.
        conversionRate: meetings ? sales / meetings : 0,
      };
    });

    const sum = (key: 'meetings' | 'proposals' | 'purchaseOrders' | 'sales') =>
      team.reduce((acc, member) => acc + member[key], 0);

    return {
      team,
      totals: {
        commercials: team.length,
        meetings: sum('meetings'),
        proposals: sum('proposals'),
        purchaseOrders: sum('purchaseOrders'),
        sales: sum('sales'),
        salesValue: team.reduce((acc, m) => acc + m.salesValue, 0),
      },
      /**
       * Entonnoir de l'équipe. Les écarts entre deux étapes disent où le
       * travail se perd : beaucoup de rendez-vous et peu de propositions
       * n'appelle pas la même réaction que l'inverse.
       */
      funnel: [
        { stage: 'Rendez-vous', count: sum('meetings') },
        { stage: 'Propositions', count: sum('proposals') },
        // Étape retirée le 07/08 : le module n'existe plus dans l'interface.
        // Le comptage par commercial reste calculé, au cas où le module
        // serait rebranché.
        { stage: 'Ventes', count: sum('sales') },
      ],
    };
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

    const commissions = await this.commissionsFor(userId);

    return {
      customersCount: customers,
      openDeals: deals.filter((d) => !d.stage.isClosedWon && !d.stage.isClosedLost),
      wonDeals: deals.filter((d) => d.stage.isClosedWon),
      upcomingActivities,
      quotesCreated: quotes,
      commissions,
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

    const [byMethod, aging, series] = await Promise.all([
      this.paymentsByMethod(period),
      this.receivableAging(),
      this.financeSeries(period),
    ]);

    return {
      invoicesSent: sentInvoices._count._all,
      invoicesSentAmount: Number(sentInvoices._sum.total ?? 0),
      paymentsReceived: payments._count._all,
      paymentsReceivedAmount: Number(payments._sum.amount ?? 0),
      overdueInvoices: overdue,
      averagePaymentDelayDays,
      byMethod,
      aging,
      series,
    };
  }

  /** Répartition des encaissements par moyen de paiement. */
  private async paymentsByMethod(period?: { gte?: Date; lte?: Date }) {
    const rows = await this.prisma.payment.groupBy({
      by: ['method'],
      where: { status: 'SUCCESS', ...(period ? { paidAt: period } : {}) },
      _sum: { amount: true },
      _count: { _all: true },
    });

    return rows
      .map((r) => ({
        method: r.method,
        amount: Number(r._sum.amount ?? 0),
        count: r._count._all,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Balance âgée du reste à recouvrer.
   *
   * Le total dû ne dit rien : mille francs en retard de cinq jours et mille
   * francs en retard de six mois n'appellent pas la même action. On répartit
   * donc par ancienneté.
   */
  private async receivableAging() {
    const invoices = await this.prisma.invoice.findMany({
      where: { status: { in: ['SENT'] } },
      select: { total: true, dueDate: true, payments: { select: { amount: true, status: true } } },
    });

    const buckets = [
      { label: 'À échoir', min: -Infinity, max: 0, amount: 0, count: 0 },
      { label: '1 à 30 jours', min: 0, max: 30, amount: 0, count: 0 },
      { label: '31 à 60 jours', min: 30, max: 60, amount: 0, count: 0 },
      { label: '61 à 90 jours', min: 60, max: 90, amount: 0, count: 0 },
      { label: 'Plus de 90 jours', min: 90, max: Infinity, amount: 0, count: 0 },
    ];

    for (const invoice of invoices) {
      const paid = invoice.payments
        .filter((p) => p.status === 'SUCCESS')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const outstanding = Number(invoice.total) - paid;
      if (outstanding <= 0) continue;

      const daysLate = invoice.dueDate
        ? Math.floor((Date.now() - invoice.dueDate.getTime()) / 86_400_000)
        : 0;

      const bucket = buckets.find((b) => daysLate > b.min && daysLate <= b.max) ?? buckets[0];
      bucket.amount += outstanding;
      bucket.count += 1;
    }

    return buckets.map(({ label, amount, count }) => ({ label, amount, count }));
  }

  /**
   * Facturé et encaissé par mois, pour la courbe.
   *
   * Sans période demandée, on retient les douze derniers mois : une courbe
   * a besoin de plusieurs points pour dire quelque chose.
   */
  private async financeSeries(period?: { gte?: Date; lte?: Date }) {
    const from = period?.gte ?? new Date(Date.now() - 365 * 86_400_000);
    const to = period?.lte ?? new Date();

    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { issuedAt: { gte: from, lte: to } },
        select: { issuedAt: true, total: true },
      }),
      this.prisma.payment.findMany({
        where: { status: 'SUCCESS', paidAt: { gte: from, lte: to } },
        select: { paidAt: true, amount: true },
      }),
    ]);

    const buckets = new Map<string, { period: string; invoiced: number; collected: number }>();
    const keyOf = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

    const touch = (key: string) => {
      if (!buckets.has(key)) buckets.set(key, { period: key, invoiced: 0, collected: 0 });
      return buckets.get(key)!;
    };

    for (const invoice of invoices) {
      touch(keyOf(invoice.issuedAt)).invoiced += Number(invoice.total);
    }

    for (const payment of payments) {
      if (!payment.paidAt) continue;
      touch(keyOf(payment.paidAt)).collected += Number(payment.amount);
    }

    return [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Commissions d'un commercial, ventilées par statut.
   *
   * « En attente » n'est pas un dû : c'est un montant calculé qu'un
   * responsable doit encore valider. Les afficher ensemble sans les
   * distinguer laisserait croire à une rémunération acquise, et la première
   * annulation d'une ligne serait vécue comme un retrait.
   */
  private async commissionsFor(userId: string) {
    const rows = await this.prisma.commission.groupBy({
      by: ['status'],
      where: { userId, status: { not: 'CANCELLED' } },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const amount = (status: string) =>
      Number(rows.find((r) => r.status === status)?._sum.amount ?? 0);

    const lines = rows.reduce((sum, r) => sum + r._count._all, 0);

    const pending = amount('PENDING');
    const approved = amount('APPROVED');
    const paid = amount('PAID');

    return {
      pending,
      approved,
      paid,
      // Ce qui est dû mais pas encore versé : le chiffre qu'un commercial
      // regarde en premier.
      payable: approved,
      total: pending + approved + paid,
      lines,
    };
  }

  /** Même ventilation, pour tous les bénéficiaires — vue Super Admin. */
  private async commissionsByCommercial() {
    const rows = await this.prisma.commission.groupBy({
      by: ['userId', 'status'],
      where: { status: { not: 'CANCELLED' } },
      _sum: { amount: true },
      _count: { _all: true },
    });

    if (rows.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.userId))] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: { select: { name: true, label: true } },
      },
    });

    return users
      .map((user) => {
        const own = rows.filter((r) => r.userId === user.id);
        const amount = (status: string) =>
          Number(own.find((r) => r.status === status)?._sum.amount ?? 0);

        const pending = amount('PENDING');
        const approved = amount('APPROVED');
        const paid = amount('PAID');

        return {
          user,
          pending,
          approved,
          paid,
          payable: approved,
          total: pending + approved + paid,
          lines: own.reduce((sum, r) => sum + r._count._all, 0),
        };
      })
      .sort((a, b) => b.total - a.total);
  }
}
