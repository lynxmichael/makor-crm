/** Rôles tels que créés par prisma/seed.ts — la casse compte. */
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN_VENTES: "ADMIN_VENTES",
  SUPERVISEUR: "SUPERVISEUR",
  COMMERCIAL: "COMMERCIAL",
  MANAGER: "MANAGER",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/** Libellés affichés — le backend stocke des codes, l'interface parle français. */
export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN_VENTES: "Admin ventes",
  SUPERVISEUR: "Superviseur",
  COMMERCIAL: "Commercial",
  MANAGER: "Manager",
};

/** Rôles pour lesquels le CDC (§2.4) impose la double authentification. */
export const TWO_FACTOR_MANDATORY_ROLES: RoleName[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN_VENTES,
  ROLES.MANAGER,
];

export const STORAGE_KEYS = {
  auth: "makor.auth",
  theme: "makor.theme",
  sidebar: "makor.sidebar",
} as const;

/** Racines des clés TanStack Query — une par ressource, invalidation ciblée. */
export const QK = {
  me: ["me"] as const,
  customers: ["customers"] as const,
  leads: ["leads"] as const,
  deals: ["deals"] as const,
  pipelineStages: ["pipeline-stages"] as const,
  quotes: ["quotes"] as const,
  purchaseOrders: ["purchase-orders"] as const,
  contracts: ["contracts"] as const,
  invoices: ["invoices"] as const,
  payments: ["payments"] as const,
  campaigns: ["campaigns"] as const,
  senderIds: ["sender-id"] as const,
  activities: ["activities"] as const,
  documents: ["documents"] as const,
  products: ["products"] as const,
  notifications: ["notifications"] as const,
  audit: ["audit"] as const,
  dashboard: ["dashboard"] as const,
  reporting: ["reporting"] as const,
  users: ["users"] as const,
  settings: ["settings"] as const,
} as const;

export const DEFAULT_PAGE_SIZE = 20;
