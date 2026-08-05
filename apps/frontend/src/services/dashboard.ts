import { api } from "@/services/api";

/**
 * Formes renvoyées par `src/dashboard/dashboard.service.ts` côté backend.
 * Transcrites depuis le service, pas devinées.
 */

export interface RevenueSummary {
  revenue: number;
  cost: number;
  margin: number;
}

export interface PipelineQuality {
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  /** Ratio 0-1, pas un pourcentage. */
  conversionRate: number;
  averageDealSize: number;
  averageSalesCycleDays: number;
}

export interface CommercialTransformation {
  userId: string;
  name: string;
  totalDeals: number;
  wonDeals: number;
  transformationRate: number;
}

export interface SuperAdminDashboard {
  totals: {
    activeUsers: number;
    customers: number;
    leads: number;
    deals: number;
    quotes: number;
    purchaseOrders: number;
    contracts: number;
    campaigns: number;
  };
  revenue: RevenueSummary;
  pipeline: PipelineQuality;
  transformationByCommercial: CommercialTransformation[];
}

export interface SalesAdminDashboard {
  revenue: RevenueSummary;
  pipelineQuality: PipelineQuality;
  campaignVolumeByStatus: { status: string; count: number }[];
  quoteSignatureRate: { sent: number; accepted: number; rate: number };
}

export interface SupervisorRow {
  userId: string;
  name: string;
  meetings: number;
  proposals: number;
  purchaseOrders: number;
  sales: number;
  salesValue: number;
}

export interface PortfolioDeal {
  id: string;
  title: string;
  amount: string | number;
  stage: { id: string; name: string };
  customer: { id: string; name: string } | null;
}

export interface PortfolioActivity {
  id: string;
  subject: string;
  type: string;
  dueDate: string | null;
}

export interface CommercialDashboard {
  customersCount: number;
  openDeals: PortfolioDeal[];
  wonDeals: PortfolioDeal[];
  upcomingActivities: PortfolioActivity[];
  quotesCreated: number;
}

export interface FinanceDashboard {
  invoicesSent: number;
  invoicesSentAmount: number;
  paymentsReceived: number;
  paymentsReceivedAmount: number;
  /** Nombre de factures échues et non réglées. */
  overdueInvoices: number;
  averagePaymentDelayDays: number;
}

export async function fetchSuperAdminDashboard(): Promise<SuperAdminDashboard> {
  const { data } = await api.get<SuperAdminDashboard>("/dashboard/super-admin");
  return data;
}

export async function fetchSalesAdminDashboard(): Promise<SalesAdminDashboard> {
  const { data } = await api.get<SalesAdminDashboard>("/dashboard/sales-admin");
  return data;
}

export async function fetchSupervisorDashboard(): Promise<SupervisorRow[]> {
  const { data } = await api.get<SupervisorRow[]>("/dashboard/supervisor");
  return data;
}

export async function fetchCommercialDashboard(): Promise<CommercialDashboard> {
  const { data } = await api.get<CommercialDashboard>("/dashboard/my-portfolio");
  return data;
}

/**
 * Le chemin reste `manager` : le rôle a été renommé FINANCE (D16), pas la
 * route — la renommer aurait été une rupture d'API sans contrepartie.
 */
export async function fetchFinanceDashboard(): Promise<FinanceDashboard> {
  const { data } = await api.get<FinanceDashboard>("/dashboard/manager");
  return data;
}
