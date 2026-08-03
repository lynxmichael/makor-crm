import { api, http } from "./api";
import type { RoleName } from "@/config/constants";
import type { Customer, CustomerInput, Paginated } from "@/types/api";

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: unknown;
}

/**
 * Fabrique de service CRUD.
 *
 * Tous les contrôleurs du backend suivent le même contrat REST
 * (GET liste paginée, GET :id, POST, PATCH :id, DELETE :id), donc les
 * décliner un par un à la main serait 25 fois le même fichier.
 */
export function createResource<T, TCreate = Partial<T>, TUpdate = Partial<T>>(path: string) {
  return {
    path,
    list: (params: ListParams = {}) => http.get<Paginated<T>>(`/${path}`, { params }),
    /** Pour les endpoints qui renvoient un tableau nu (référentiels courts). */
    all: (params: ListParams = {}) => http.get<T[]>(`/${path}`, { params }),
    get: (id: string) => http.get<T>(`/${path}/${id}`),
    create: (body: TCreate) => http.post<T>(`/${path}`, body),
    update: (id: string, body: TUpdate) => http.patch<T>(`/${path}/${id}`, body),
    remove: (id: string) => http.delete<{ id: string }>(`/${path}/${id}`),
  };
}

export type Resource<T> = ReturnType<typeof createResource<T>>;

// Une entrée par module du backend. Les types précis seront resserrés
// module par module ; `Record<string, unknown>` évite de bloquer le
// branchement en attendant.
type Row = Record<string, any>;

export const customersService = createResource<Customer, CustomerInput, Partial<CustomerInput>>(
  "customers",
);
export const contactsService = createResource<Row>("contacts");
export const leadsService = createResource<Row>("leads");
export const dealsService = createResource<Row>("deals");
export const pipelineStagesService = createResource<Row>("pipeline-stages");
export const activitiesService = createResource<Row>("activities");
export const productsService = createResource<Row>("products");
export const quotesService = createResource<Row>("quotes");
export const purchaseOrdersService = createResource<Row>("purchase-orders");
export const contractsService = createResource<Row>("contracts");
export const invoicesService = createResource<Row>("invoices");
export const paymentsService = createResource<Row>("payments");
export const campaignsService = createResource<Row>("campaigns");
export const senderIdService = createResource<Row>("sender-id");
export const documentsService = createResource<Row>("documents");
export const notificationsService = createResource<Row>("notifications");
export const objectivesService = createResource<Row>("objectives");
export const auditService = createResource<Row>("audit");
export const usersService = createResource<Row>("users");
export const rolesService = createResource<Row>("roles");

/** Endpoints qui ne suivent pas le motif CRUD. */

/**
 * Le backend n'expose pas un tableau de bord unique mais un endpoint par
 * profil, chacun protégé par son propre `@Roles` (dashboard.controller.ts).
 * On choisit donc la route d'après le rôle de l'utilisateur connecté —
 * appeler la mauvaise renvoie un 403, pas des données vides.
 */
const DASHBOARD_ROUTES: Record<RoleName, string> = {
  SUPER_ADMIN: "super-admin",
  ADMIN_VENTES: "sales-admin",
  SUPERVISEUR: "supervisor",
  COMMERCIAL: "my-portfolio",
  MANAGER: "manager",
};

export const dashboardService = {
  routeFor: (role: RoleName) => DASHBOARD_ROUTES[role],
  forRole: (role: RoleName, params?: Record<string, unknown>) =>
    http.get<Row>(`/dashboard/${DASHBOARD_ROUTES[role]}`, { params }),
  /** Portefeuille personnel — accessible à tous les rôles, sans restriction. */
  myPortfolio: (params?: Record<string, unknown>) =>
    http.get<Row>("/dashboard/my-portfolio", { params }),
};

/**
 * Rapports (CDC §4.15).
 *
 * Ces endpoints ne renvoient pas du JSON mais un **fichier** — csv, xlsx ou
 * pdf — avec un en-tête Content-Disposition. On les récupère donc en blob et
 * on déclenche le téléchargement : le jeton voyage dans un en-tête, un lien
 * direct se solderait par un 401.
 */
export type ExportFormat = "csv" | "xlsx" | "pdf";

async function downloadReport(
  path: string,
  filename: string,
  params: Record<string, unknown>,
) {
  const response = await api.get(path, { params, responseType: "blob" });

  const format = String(params.format ?? "xlsx");
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.${format}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const reportingService = {
  customers: (params: Record<string, unknown>) =>
    downloadReport("/reporting/customers", "clients", params),
  deals: (params: Record<string, unknown>) =>
    downloadReport("/reporting/deals", "pipeline", params),
  invoices: (params: Record<string, unknown>) =>
    downloadReport("/reporting/invoices", "factures", params),
  recharges: (params: Record<string, unknown>) =>
    downloadReport("/reporting/recharges", "rechargements", params),
  salesPerformance: (params: Record<string, unknown>) =>
    downloadReport("/reporting/sales-performance", "performance-commerciale", params),
  campaignRecipients: (campaignId: string, params: Record<string, unknown>) =>
    downloadReport(
      `/reporting/campaigns/${campaignId}/recipients`,
      `campagne-${campaignId}`,
      params,
    ),
};

export const searchService = {
  global: (q: string, limit = 5) => http.get<Row>("/search", { params: { q, limit } }),
};

export const settingsService = {
  organization: () => http.get<Row>("/settings/organization"),
  updateOrganization: (body: Row) => http.patch<Row>("/settings/organization", body),

  sectors: () => http.get<Row[]>("/settings/sectors"),
  createSector: (body: Row) => http.post<Row>("/settings/sectors", body),
  updateSector: (id: string, body: Row) => http.patch<Row>(`/settings/sectors/${id}`, body),
  removeSector: (id: string) => http.delete<Row>(`/settings/sectors/${id}`),

  countries: () => http.get<Row[]>("/settings/countries"),
  createCountry: (body: Row) => http.post<Row>("/settings/countries", body),
  updateCountry: (id: string, body: Row) => http.patch<Row>(`/settings/countries/${id}`, body),
  removeCountry: (id: string) => http.delete<Row>(`/settings/countries/${id}`),

  currencies: () => http.get<Row[]>("/settings/currencies"),
  createCurrency: (body: Row) => http.post<Row>("/settings/currencies", body),
  updateCurrency: (id: string, body: Row) => http.patch<Row>(`/settings/currencies/${id}`, body),
  removeCurrency: (id: string) => http.delete<Row>(`/settings/currencies/${id}`),
};
