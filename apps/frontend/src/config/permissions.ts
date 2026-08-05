import type { Role } from "@/config/roles";

/** Les cinq domaines de la matrice §7 du CDC. */
export const PERMISSION_DOMAINS = [
  "clients",
  "pipeline",
  "campaigns",
  "facturation",
  "reporting",
] as const;

export type PermissionDomain = (typeof PERMISSION_DOMAINS)[number];

/** Niveaux d'accès, du plus faible au plus fort. */
export type PermissionLevel = "aucun" | "lecture" | "ecriture" | "total";

const RANK: Record<PermissionLevel, number> = {
  aucun: 0,
  lecture: 1,
  ecriture: 2,
  total: 3,
};

export const DOMAIN_LABELS: Record<PermissionDomain, string> = {
  clients: "Clients, prospects et opportunités",
  pipeline: "Pipeline, devis, bons de commande et contrats",
  campaigns: "Campagnes",
  facturation: "Facturation et encaissements",
  reporting: "Reporting et administration",
};

const LEVEL_LABELS: Record<PermissionLevel, string> = {
  aucun: "aucun accès",
  lecture: "un accès en lecture seule",
  ecriture: "un accès en écriture",
  total: "un accès total",
};

/**
 * Matrice de droits.
 *
 * Reprise du `permissionMatrix` de la maquette (`makor-crm-maquette.html`
 * l. 1281), confrontée à la matrice §7 du CDC. Les deux concordent sur 24 des
 * 25 cases.
 *
 * **La 25ᵉ est arbitrée en faveur de D8.** La maquette et le §7 donnent au
 * cinquième rôle un accès en lecture seule sur le domaine Pipeline, mais D8
 * acte que ce rôle **crée des bons de commande** — la matrice §7 est jugée
 * erronée sur ce point au profit du §4.1. FINANCE obtient donc `ecriture` sur
 * `pipeline`, et l'écran de la chaîne commerciale restreint lui-même
 * l'écriture aux bons de commande.
 */
export const PERMISSION_MATRIX: Record<Role, Record<PermissionDomain, PermissionLevel>> = {
  SUPER_ADMIN: {
    clients: "total",
    pipeline: "total",
    campaigns: "total",
    facturation: "total",
    reporting: "total",
  },
  ADMIN_VENTES: {
    clients: "lecture",
    pipeline: "lecture",
    campaigns: "lecture",
    facturation: "aucun",
    reporting: "total",
  },
  SUPERVISEUR: {
    clients: "lecture",
    pipeline: "lecture",
    campaigns: "lecture",
    facturation: "aucun",
    reporting: "ecriture",
  },
  COMMERCIAL: {
    clients: "ecriture",
    pipeline: "ecriture",
    campaigns: "ecriture",
    facturation: "aucun",
    // « Lecture (soi) » au CDC : la restriction au périmètre propre est
    // appliquée par l'API, pas par ce niveau.
    reporting: "lecture",
  },
  FINANCE: {
    clients: "lecture",
    pipeline: "ecriture", // D8 — voir le commentaire ci-dessus
    campaigns: "aucun",
    facturation: "total",
    reporting: "lecture",
  },
};

export function permissionLevel(role: Role, domain: PermissionDomain): PermissionLevel {
  return PERMISSION_MATRIX[role][domain];
}

/** Le rôle atteint-il au moins le niveau demandé sur ce domaine ? */
export function hasPermission(
  role: Role,
  domain: PermissionDomain,
  required: PermissionLevel = "lecture",
): boolean {
  return RANK[permissionLevel(role, domain)] >= RANK[required];
}

/**
 * Raison du refus, affichée dans l'infobulle de l'action désactivée.
 *
 * Un refus silencieux est un défaut : l'utilisateur doit comprendre pourquoi
 * il ne peut pas agir. Même exigence que D5 sur le pipeline.
 */
export function denialReason(role: Role, domain: PermissionDomain): string {
  const level = permissionLevel(role, domain);
  return (
    `Votre rôle n'a que ${LEVEL_LABELS[level]} sur « ${DOMAIN_LABELS[domain]} » ` +
    `(matrice §7 du cahier des charges).`
  );
}
