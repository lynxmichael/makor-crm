import {
  LayoutDashboard,
  Building2,
  UserPlus,
  Target,
  Radio,
  FileText,
  ClipboardList,
  FileSignature,
  Receipt,
  Wallet,
  Fingerprint,
  Calendar,
  MessagesSquare,
  FolderOpen,
  BarChart3,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { ROLES, type RoleName } from "./constants";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Rôles autorisés à voir l'entrée. Absent = visible par tous. */
  roles?: RoleName[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const ALL_SALES: RoleName[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN_VENTES,
  ROLES.SUPERVISEUR,
  ROLES.COMMERCIAL,
];

const FINANCE: RoleName[] = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

/**
 * Navigation dérivée du tableau des permissions du CDC (§7).
 *
 * Masquer une entrée n'est pas une sécurité — le backend garde le dernier
 * mot via ses guards. C'est une question de lisibilité : un Manager n'a
 * rien à faire dans un menu Campagnes auquel il n'a pas accès.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Vue d'ensemble",
    items: [
      { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
      { to: "/messages", label: "Messages", icon: MessagesSquare },
    ],
  },
  {
    label: "Commercial",
    items: [
      { to: "/clients", label: "Clients", icon: Building2 },
      { to: "/prospects", label: "Prospects", icon: UserPlus },
      { to: "/opportunities", label: "Pipeline", icon: Target },
      { to: "/quotes", label: "Devis", icon: FileText },
      { to: "/purchase-orders", label: "Bons de commande", icon: ClipboardList },
      { to: "/contracts", label: "Contrats", icon: FileSignature },
      { to: "/agenda", label: "Agenda", icon: Calendar, roles: ALL_SALES },
    ],
  },
  {
    label: "Opérations",
    items: [
      { to: "/campaigns", label: "Campagnes", icon: Radio, roles: ALL_SALES },
      { to: "/sender-id", label: "Sender ID", icon: Fingerprint, roles: ALL_SALES },
      { to: "/documents", label: "Documents", icon: FolderOpen },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/invoicing", label: "Facturation", icon: Receipt, roles: FINANCE },
      { to: "/payments", label: "Encaissements", icon: Wallet, roles: FINANCE },
    ],
  },
  {
    label: "Pilotage",
    items: [
      { to: "/reports", label: "Rapports", icon: BarChart3 },
      { to: "/audit", label: "Audit", icon: ShieldCheck, roles: [ROLES.SUPER_ADMIN] },
    ],
  },
  {
    label: "Système",
    items: [
      {
        to: "/settings",
        label: "Paramètres",
        icon: Settings,
        roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN_VENTES],
      },
    ],
  },
];

/** Retire les entrées interdites au rôle, puis les groupes devenus vides. */
export function navigationFor(role: RoleName | null): NavGroup[] {
  if (!role) return [];

  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

/** Rôles autorisés par route, pour le garde de navigation. */
export const ROUTE_ROLES: Record<string, RoleName[]> = Object.fromEntries(
  NAV_GROUPS.flatMap((group) =>
    group.items.filter((item) => item.roles).map((item) => [item.to, item.roles!]),
  ),
);
