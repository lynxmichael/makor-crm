/**
 * Les cinq rôles du CRM.
 *
 * Point de passage unique entre le nom porté par la base (`Role.name`, seed
 * Prisma) et ce que voit l'utilisateur. Si un rôle est un jour renommé côté
 * backend, ce fichier est le seul à changer.
 *
 * Le CDC §7 appelle le cinquième rôle « Manager » ; D16 retient **FINANCE**,
 * le nom de la maquette validée par la direction.
 */
export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN_VENTES",
  "SUPERVISEUR",
  "COMMERCIAL",
  "FINANCE",
] as const;

export type Role = (typeof ROLES)[number];

/** Libellé affiché, tel qu'écrit dans la maquette. */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN_VENTES: "Admin ventes",
  SUPERVISEUR: "Superviseur",
  COMMERCIAL: "Commercial",
  FINANCE: "Finance",
};

/**
 * Clés employées par la maquette dans ses attributs `data-roles`. Conservées
 * telles quelles pour que la correspondance avec `makor-crm-maquette.html`
 * reste vérifiable ligne à ligne.
 */
export const ROLE_MAQUETTE_KEYS: Record<Role, string> = {
  SUPER_ADMIN: "superadmin",
  ADMIN_VENTES: "adminventes",
  SUPERVISEUR: "superviseur",
  COMMERCIAL: "commercial",
  FINANCE: "finance",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Salutation du tableau de bord — maquette, `dashSubs`. */
export const ROLE_DASHBOARD_SUBTITLES: Record<Role, string> = {
  SUPER_ADMIN: "Vue consolidée de tous les profils",
  ADMIN_VENTES: "Pilotage des ventes et qualité du pipeline",
  SUPERVISEUR: "Supervision de l'équipe commerciale",
  COMMERCIAL: "Voici la performance de votre portefeuille",
  FINANCE: "Facturation, encaissements et recouvrement",
};
