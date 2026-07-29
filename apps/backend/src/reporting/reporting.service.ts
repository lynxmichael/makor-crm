import { BadRequestException, Injectable } from '@nestjs/common';

import ExcelJS from 'exceljs';

import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../common/pdf/pdf.service';
import { SettingsService } from '../settings/settings.service';

import { Prisma } from '@prisma/client';

import { buildCsv, ExportColumn, ExportFile, ExportFormat } from './reporting.utils';

export interface ReportFilters {
  from?: string;
  to?: string;
  country?: string;
  sector?: string;
  productId?: string;
  customerId?: string;
}

/**
 * Rapports exportables (CDC §4.15) : chaque méthode produit les mêmes
 * données quel que soit le format demandé — seule la sérialisation
 * finale change (CSV / Excel / PDF), pour garantir la cohérence entre
 * les trois formats.
 */
@Injectable()
export class ReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly settingsService: SettingsService,
  ) {}

  private period(filters: ReportFilters) {
    if (!filters.from && !filters.to) return undefined;
    return {
      gte: filters.from ? new Date(filters.from) : undefined,
      lte: filters.to ? new Date(filters.to) : undefined,
    };
  }

  private async render(
    format: ExportFormat,
    title: string,
    columns: ExportColumn[],
    rows: Record<string, unknown>[],
    subtitle?: string,
  ): Promise<ExportFile> {
    if (format === 'csv') {
      return {
        buffer: buildCsv(columns, rows),
        contentType: 'text/csv; charset=utf-8',
        extension: 'csv',
      };
    }

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title.slice(0, 31));

      sheet.columns = columns.map((c) => ({
        header: c.label,
        key: c.key,
        width: (c.width ?? 100) / 6,
      }));

      sheet.getRow(1).font = { bold: true };
      sheet.addRows(rows);

      const buffer = await workbook.xlsx.writeBuffer();

      return {
        buffer: Buffer.from(buffer),
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
      };
    }

    if (format === 'pdf') {
      const pdfColumns = columns.map((c) => ({
        label: c.label,
        width: c.width ?? 100,
      }));

      const pdfRows = rows.map((row) =>
        columns.map((c) => String(row[c.key] ?? '')),
      );

      const buffer = await this.pdfService.generateTableDocument(
        title,
        pdfColumns,
        pdfRows,
        subtitle,
      );

      return { buffer, contentType: 'application/pdf', extension: 'pdf' };
    }

    throw new BadRequestException(`Format d'export non supporté : ${format}`);
  }

  // -------------------------------------------------------------------
  // Clients
  // -------------------------------------------------------------------

  async customers(format: ExportFormat, filters: ReportFilters) {
    const customers = await this.prisma.customer.findMany({
      where: {
        country: filters.country,
        sector: filters.sector,
      },
      include: { assignedTo: true },
      orderBy: { companyName: 'asc' },
    });

    const columns: ExportColumn[] = [
      { key: 'code', label: 'Code', width: 70 },
      { key: 'companyName', label: 'Client', width: 160 },
      { key: 'sector', label: 'Secteur', width: 100 },
      { key: 'country', label: 'Pays', width: 80 },
      { key: 'phone', label: 'Téléphone', width: 100 },
      { key: 'email', label: 'Email', width: 150 },
      { key: 'walletBalance', label: 'Solde prépayé', width: 100 },
      { key: 'status', label: 'Statut', width: 80 },
      { key: 'assignedTo', label: 'Commercial', width: 130 },
    ];

    const rows = customers.map((c) => ({
      code: c.code,
      companyName: c.companyName,
      sector: c.sector ?? '',
      country: c.country ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      walletBalance: Number(c.walletBalance),
      status: c.status,
      assignedTo: c.assignedTo ? `${c.assignedTo.firstName} ${c.assignedTo.lastName}` : '',
    }));

    return this.render(format, 'Clients', columns, rows);
  }

  // -------------------------------------------------------------------
  // Pipeline / opportunités
  // -------------------------------------------------------------------

  async deals(format: ExportFormat, filters: ReportFilters) {
    const deals = await this.prisma.deal.findMany({
      where: { createdAt: this.period(filters) },
      include: { stage: true, customer: true, lead: true, assignedTo: true },
      orderBy: { createdAt: 'desc' },
    });

    const columns: ExportColumn[] = [
      { key: 'title', label: 'Opportunité', width: 160 },
      { key: 'stage', label: 'Étape', width: 100 },
      { key: 'amount', label: 'Montant', width: 90 },
      { key: 'probability', label: 'Probabilité %', width: 80 },
      { key: 'customer', label: 'Client / Prospect', width: 150 },
      { key: 'assignedTo', label: 'Commercial', width: 130 },
      { key: 'createdAt', label: 'Créée le', width: 90 },
    ];

    const rows = deals.map((d) => ({
      title: d.title,
      stage: d.stage.name,
      amount: Number(d.amount),
      probability: d.probability,
      customer: d.customer?.companyName ?? (d.lead ? `${d.lead.firstName} ${d.lead.lastName}` : ''),
      assignedTo: `${d.assignedTo.firstName} ${d.assignedTo.lastName}`,
      createdAt: d.createdAt.toLocaleDateString('fr-FR'),
    }));

    return this.render(format, 'Pipeline commercial', columns, rows);
  }

  // -------------------------------------------------------------------
  // Facturation & encaissements
  // -------------------------------------------------------------------

  async invoices(format: ExportFormat, filters: ReportFilters) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        issuedAt: this.period(filters),
        customerId: filters.customerId,
      },
      include: { customer: true, payments: true },
      orderBy: { issuedAt: 'desc' },
    });

    const columns: ExportColumn[] = [
      { key: 'number', label: 'N° Facture', width: 90 },
      { key: 'customer', label: 'Client', width: 150 },
      { key: 'total', label: 'Montant TTC', width: 90 },
      { key: 'paid', label: 'Encaissé', width: 90 },
      { key: 'status', label: 'Statut', width: 80 },
      { key: 'issuedAt', label: 'Émise le', width: 90 },
      { key: 'dueDate', label: 'Échéance', width: 90 },
    ];

    const rows = invoices.map((inv) => ({
      number: inv.number,
      customer: inv.customer.companyName,
      total: Number(inv.total),
      paid: inv.payments
        .filter((p) => p.status === 'SUCCESS')
        .reduce((sum, p) => sum + Number(p.amount), 0),
      status: inv.status,
      issuedAt: inv.issuedAt.toLocaleDateString('fr-FR'),
      dueDate: inv.dueDate ? inv.dueDate.toLocaleDateString('fr-FR') : '',
    }));

    return this.render(format, 'Factures & encaissements', columns, rows);
  }

  // -------------------------------------------------------------------
  // Réchargements / soldes prépayés
  // -------------------------------------------------------------------

  async recharges(format: ExportFormat, filters: ReportFilters) {
    const recharges = await this.prisma.recharge.findMany({
      where: {
        date: this.period(filters),
        customerId: filters.customerId,
      },
      include: { customer: true, product: true, recordedBy: true },
      orderBy: { date: 'desc' },
    });

    const columns: ExportColumn[] = [
      { key: 'date', label: 'Date', width: 80 },
      { key: 'customer', label: 'Client', width: 150 },
      { key: 'product', label: 'Produit', width: 120 },
      { key: 'amount', label: 'Montant rechargé', width: 100 },
      { key: 'recordedBy', label: 'Enregistré par', width: 130 },
    ];

    const rows = recharges.map((r) => ({
      date: r.date.toLocaleDateString('fr-FR'),
      customer: r.customer.companyName,
      product: r.product?.name ?? '',
      amount: Number(r.amount),
      recordedBy: r.recordedBy ? `${r.recordedBy.firstName} ${r.recordedBy.lastName}` : '',
    }));

    return this.render(format, 'Réchargements', columns, rows);
  }

  // -------------------------------------------------------------------
  // Rejets / délivrabilité campagne
  // -------------------------------------------------------------------

  async campaignRecipients(campaignId: string, format: ExportFormat) {
    const campaign = await this.prisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
    });

    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'asc' },
    });

    const columns: ExportColumn[] = [
      { key: 'destination', label: 'Destinataire', width: 120 },
      { key: 'status', label: 'Statut', width: 80 },
      { key: 'errorCode', label: 'Code erreur', width: 100 },
      { key: 'cost', label: 'Coût', width: 60 },
      { key: 'sentAt', label: 'Envoyé le', width: 100 },
      { key: 'deliveredAt', label: 'Livré le', width: 100 },
    ];

    const rows = recipients.map((r) => ({
      destination: r.destination,
      status: r.status,
      errorCode: r.errorCode ?? '',
      cost: r.cost ? Number(r.cost) : '',
      sentAt: r.sentAt ? r.sentAt.toLocaleString('fr-FR') : '',
      deliveredAt: r.deliveredAt ? r.deliveredAt.toLocaleString('fr-FR') : '',
    }));

    return this.render(
      format,
      `Rejets & délivrabilité — ${campaign.name}`,
      columns,
      rows,
    );
  }

  // -------------------------------------------------------------------
  // Performance commerciale (taille moyenne des deals, taux de
  // transformation, cycle de vente) — CDC §9
  // -------------------------------------------------------------------

  async salesPerformance(format: ExportFormat, filters: ReportFilters) {
    const where: Prisma.DealWhereInput = { createdAt: this.period(filters) };

    const commercials = await this.prisma.user.findMany({
      where: { isActive: true, deals: { some: {} } },
      select: { id: true, firstName: true, lastName: true },
    });

    const rows = await Promise.all(
      commercials.map(async (c) => {
        const deals = await this.prisma.deal.findMany({
          where: { ...where, assignedToId: c.id },
          include: { stage: true },
        });

        const total = deals.length;
        const won = deals.filter((d) => d.stage.isClosedWon);
        const wonAmount = won.reduce((sum, d) => sum + Number(d.amount), 0);

        return {
          commercial: `${c.firstName} ${c.lastName}`,
          totalDeals: total,
          wonDeals: won.length,
          conversionRate: total ? `${Math.round((won.length / total) * 100)}%` : '0%',
          averageDealSize: won.length ? Math.round(wonAmount / won.length) : 0,
          totalWonAmount: wonAmount,
        };
      }),
    );

    const columns: ExportColumn[] = [
      { key: 'commercial', label: 'Commercial', width: 140 },
      { key: 'totalDeals', label: 'Opportunités', width: 90 },
      { key: 'wonDeals', label: 'Gagnées', width: 80 },
      { key: 'conversionRate', label: 'Taux de transformation', width: 100 },
      { key: 'averageDealSize', label: 'Panier moyen', width: 100 },
      { key: 'totalWonAmount', label: 'CA généré', width: 100 },
    ];

    return this.render(format, 'Performance commerciale', columns, rows);
  }
}
