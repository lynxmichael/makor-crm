import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CreditCard,
  FileSignature,
  Fingerprint,
  FolderOpen,
  LayoutDashboard,
  MessageCircle,
  Package,
  Radio,
  Receipt,
  Settings,
  ShieldCheck,
  Target,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/config/roles";
import type { PermissionDomain } from "@/config/permissions";

export interface NavModule {
  /** Identifiant `data-view` de la maquette — sert de clé de correspondance. */
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Rôles autorisés, repris des `data-roles` de la maquette. */
  roles: readonly Role[];
  /** Domaine de la matrice de droits qui gouverne les actions de l'écran. */
  domain: PermissionDomain;
  /** Badge affiché à droite du libellé (« V2 » sur Messagerie, D3). */
  badge?: string;
}

export interface NavGroup {
  label: string;
  modules: NavModule[];
}

const TOUS: readonly Role[] = [
  "SUPER_ADMIN",
  "ADMIN_VENTES",
  "SUPERVISEUR",
  "COMMERCIAL",
  "FINANCE",
];

const SANS_FINANCE: readonly Role[] = [
  "SUPER_ADMIN",
  "ADMIN_VENTES",
  "SUPERVISEUR",
  "COMMERCIAL",
];

/**
 * Les 18 modules de la barre latérale.
 *
 * Source : `design/makor-crm-maquette.html`. Quinze sont déclarés en HTML avec
 * leur attribut `data-roles` (l. 482 à 542), trois sont injectés par la passe 5
 * (l. 2841) : Ressources, Équipe, Notes de frais. La navigation conditionnée
 * par rôle qu'exige le CDC §7 y est déjà résolue module par module — on la
 * transcrit, on ne la réinvente pas.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Pilotage",
    modules: [
      {
        id: "dashboard",
        label: "Tableau de bord",
        path: "/",
        icon: LayoutDashboard,
        roles: TOUS,
        domain: "reporting",
      },
    ],
  },
  {
    label: "Ventes",
    modules: [
      {
        id: "pipeline",
        label: "Pipeline",
        path: "/pipeline",
        icon: Target,
        roles: SANS_FINANCE,
        domain: "pipeline",
      },
      {
        id: "leads",
        label: "Prospects",
        path: "/prospects",
        icon: UserPlus,
        roles: SANS_FINANCE,
        domain: "clients",
      },
      {
        id: "customers",
        label: "Clients",
        path: "/clients",
        icon: Building2,
        roles: TOUS,
        domain: "clients",
      },
    ],
  },
  {
    label: "Commercial",
    modules: [
      {
        id: "campaigns",
        label: "Campagnes",
        path: "/campagnes",
        icon: Radio,
        roles: SANS_FINANCE,
        domain: "campaigns",
      },
      {
        id: "deals-chain",
        label: "Devis · BC · Contrats",
        path: "/chaine-commerciale",
        icon: FileSignature,
        roles: TOUS,
        domain: "pipeline",
      },
      {
        id: "agenda",
        label: "Agenda",
        path: "/agenda",
        icon: Calendar,
        roles: TOUS,
        domain: "clients",
      },
      {
        id: "senderid",
        label: "Sender ID",
        path: "/sender-id",
        icon: Fingerprint,
        roles: ["SUPER_ADMIN", "ADMIN_VENTES"],
        domain: "campaigns",
      },
      {
        id: "documents",
        label: "Documents",
        path: "/documents",
        icon: FolderOpen,
        roles: TOUS,
        domain: "clients",
      },
      {
        id: "invoices",
        label: "Facturation & Encaissements",
        path: "/facturation",
        icon: Receipt,
        roles: ["SUPER_ADMIN", "ADMIN_VENTES", "FINANCE"],
        domain: "facturation",
      },
      {
        id: "frais",
        label: "Notes de frais",
        path: "/notes-de-frais",
        icon: CreditCard,
        roles: TOUS,
        domain: "facturation",
      },
      {
        // Badgée V2 dans la maquette, conformément à D3 : la messagerie
        // interne est repoussée en V2, seul l'envoi de document par email
        // depuis une fiche existe en V1.
        id: "messaging",
        label: "Messagerie",
        path: "/messagerie",
        icon: MessageCircle,
        roles: TOUS,
        domain: "clients",
        badge: "V2",
      },
    ],
  },
  {
    label: "Pilotage & contrôle",
    modules: [
      {
        id: "reports",
        label: "Reporting",
        path: "/reporting",
        icon: BarChart3,
        roles: ["SUPER_ADMIN", "ADMIN_VENTES", "SUPERVISEUR", "FINANCE"],
        domain: "reporting",
      },
      {
        id: "equipe",
        label: "Équipe",
        path: "/equipe",
        icon: Users,
        roles: ["SUPER_ADMIN", "ADMIN_VENTES", "SUPERVISEUR"],
        domain: "reporting",
      },
      {
        id: "audit",
        label: "Audit",
        path: "/audit",
        icon: ShieldCheck,
        roles: ["SUPER_ADMIN"],
        domain: "reporting",
      },
    ],
  },
  {
    label: "Formation",
    modules: [
      {
        id: "ressources",
        label: "Ressources",
        path: "/ressources",
        icon: BookOpen,
        roles: TOUS,
        domain: "reporting",
      },
    ],
  },
  {
    label: "Système",
    modules: [
      {
        id: "products",
        label: "Produits",
        path: "/produits",
        icon: Package,
        roles: ["SUPER_ADMIN", "ADMIN_VENTES"],
        domain: "campaigns",
      },
      {
        id: "settings",
        label: "Paramètres",
        path: "/parametres",
        icon: Settings,
        roles: ["SUPER_ADMIN", "ADMIN_VENTES"],
        domain: "reporting",
      },
    ],
  },
];

export const ALL_MODULES: NavModule[] = NAV_GROUPS.flatMap((group) => group.modules);

/** Groupes dont au moins un module est autorisé au rôle donné. */
export function navigationForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    modules: group.modules.filter((module) => module.roles.includes(role)),
  })).filter((group) => group.modules.length > 0);
}

export function moduleForPath(pathname: string): NavModule | undefined {
  // Le chemin le plus long d'abord : sans cela « / » capterait tout.
  return [...ALL_MODULES]
    .sort((a, b) => b.path.length - a.path.length)
    .find((module) => pathname === module.path || pathname.startsWith(`${module.path}/`));
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const module = moduleForPath(pathname);
  return module ? module.roles.includes(role) : true;
}

/** Premier module autorisé — destination de repli après un refus d'accès. */
export function firstAllowedPath(role: Role): string {
  return ALL_MODULES.find((module) => module.roles.includes(role))?.path ?? "/";
}
