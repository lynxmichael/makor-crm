import type { RoleName } from "@/config/constants";

/** Enveloppe renvoyée par tous les `findAll` du backend (voir customers.service.ts). */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Role {
  id: string;
  name: RoleName;
  description?: string | null;
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  jobTitle?: string | null;
  isActive: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: string | null;
  roleId: string;
  role: Role;
  companyId?: string | null;
  departmentId?: string | null;
}

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
  /** Le backend signale les comptes à rôle sensible sans 2FA configurée. */
  twoFactorSetupRequired: boolean;
}

export interface TwoFactorChallenge {
  requiresTwoFactor: true;
  challengeToken: string;
}

export type LoginResult = SessionTokens | TwoFactorChallenge;

export function isTwoFactorChallenge(result: LoginResult): result is TwoFactorChallenge {
  return "requiresTwoFactor" in result && result.requiresTwoFactor;
}

/** Erreur normalisée : peu importe la forme renvoyée par Nest, on lit toujours pareil. */
export interface ApiError {
  status: number;
  message: string;
  /** Erreurs de validation champ par champ, quand class-validator en fournit. */
  fieldErrors?: Record<string, string>;
  isNetworkError: boolean;
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

/** Miroir de l'enum Prisma `CustomerStatus`. */
export type CustomerStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

/** Utilisateur tel qu'inclus en relation (`include: { assignedTo: true }`). */
export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string | null;
}

export interface Customer {
  id: string;
  /** Généré par le serveur si absent à la création (`CUST-…`). */
  code: string;
  companyName: string;
  sector?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  status: CustomerStatus;
  notes?: string | null;
  /** Decimal Prisma : transite en chaîne, à convertir avant tout calcul. */
  walletBalance: string;
  assignedToId?: string | null;
  assignedTo?: UserSummary | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Champs acceptés à l'écriture. Le backend tourne avec
 * `forbidNonWhitelisted: true` : tout champ hors DTO fait échouer la requête
 * en 400, d'où ce type strict plutôt qu'un `Partial<Customer>`.
 */
export interface CustomerInput {
  companyName: string;
  code?: string;
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

/** Filtres reconnus par `FilterCustomerDto` — et eux seuls. */
export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  status?: CustomerStatus;
}
