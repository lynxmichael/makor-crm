import { api } from "@/services/api";

/**
 * Formes renvoyées par `src/customers/customers.service.ts` côté backend,
 * transcrites depuis le service et ses DTO, pas devinées.
 */

/** Enum `CustomerStatus` du schéma Prisma. */
export const CUSTOMER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  SUSPENDED: "Suspendu",
};

export interface CustomerOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Customer {
  id: string;
  /** Référence métier, unique et générée par le backend si elle est omise. */
  code: string;
  companyName: string;
  sector: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  status: CustomerStatus;
  notes: string | null;
  /** `Decimal` côté Prisma, sérialisé en chaîne. Ne jamais l'additionner tel quel. */
  walletBalance: string | number;
  assignedToId: string | null;
  assignedTo: CustomerOwner | null;
  createdAt: string;
  updatedAt: string;
}

/** Enveloppe de pagination du backend — identique sur tous ses `findAll`. */
export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerQuery {
  page?: number;
  limit?: number;
  /** Recherche serveur sur la raison sociale, le code et l'email. */
  search?: string;
  country?: string;
  status?: CustomerStatus;
}

export const CUSTOMERS_QUERY_KEY = ["customers"] as const;

/** Page par défaut du backend : 10. Relevé à 20, la densité de la maquette. */
export const CUSTOMERS_PAGE_SIZE = 20;

/**
 * La recherche est envoyée au serveur et non appliquée à une page déjà
 * chargée : filtrer localement ne chercherait que dans les 20 premiers clients,
 * ce qui donnerait des résultats faux dès le 21ᵉ.
 */
export async function fetchCustomers(query: CustomerQuery = {}): Promise<Page<Customer>> {
  const { data } = await api.get<Page<Customer>>("/customers", {
    params: {
      page: query.page ?? 1,
      limit: query.limit ?? CUSTOMERS_PAGE_SIZE,
      // Une chaîne vide serait transmise telle quelle et filtrerait sur rien.
      ...(query.search?.trim() ? { search: query.search.trim() } : {}),
      ...(query.country ? { country: query.country } : {}),
      ...(query.status ? { status: query.status } : {}),
    },
  });
  return data;
}

/**
 * Champs acceptés par `CreateCustomerDto`. Tous facultatifs sauf la raison
 * sociale ; `code` est généré par le backend quand il est omis.
 */
export interface CustomerPayload {
  companyName: string;
  sector?: string;
  country?: string;
  city?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  status?: CustomerStatus;
  notes?: string;
  assignedToId?: string;
}

export async function createCustomer(payload: CustomerPayload): Promise<Customer> {
  const { data } = await api.post<Customer>("/customers", payload);
  return data;
}

/** `UpdateCustomerDto` dérive de la création par `PartialType` : tout est facultatif. */
export async function updateCustomer(
  customerId: string,
  payload: Partial<CustomerPayload>,
): Promise<Customer> {
  const { data } = await api.patch<Customer>(`/customers/${customerId}`, payload);
  return data;
}

/**
 * Changement de statut — c'est ce que l'écran appelle « archiver » et
 * « réactiver ». Volontairement distinct de la suppression : un client inactif
 * garde ses factures, ses opportunités et son historique.
 */
export function setCustomerStatus(
  customerId: string,
  status: CustomerStatus,
): Promise<Customer> {
  return updateCustomer(customerId, { status });
}

/**
 * Suppression définitive, réservée au Super Admin (§7 « total »). Elle n'est
 * pas exposée par l'écran Clients aujourd'hui : archiver répond au besoin
 * courant sans détruire d'historique.
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  await api.delete(`/customers/${customerId}`);
}
