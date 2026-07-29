import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import makorLogo from "@/assets/makor-logo.png";
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
  FolderOpen,
  BarChart3,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  { label: "Vue d'ensemble", items: [{ to: "/", label: "Tableau de bord", icon: LayoutDashboard }] },
  {
    label: "Commercial",
    items: [
      { to: "/clients", label: "Clients", icon: Building2 },
      { to: "/prospects", label: "Prospects", icon: UserPlus },
      { to: "/opportunities", label: "Pipeline", icon: Target },
      { to: "/quotes", label: "Devis", icon: FileText },
      { to: "/purchase-orders", label: "Bons de commande", icon: ClipboardList },
      { to: "/contracts", label: "Contrats", icon: FileSignature },
      { to: "/agenda", label: "Agenda", icon: Calendar },
    ],
  },
  {
    label: "Opérations",
    items: [
      { to: "/campaigns", label: "Campagnes", icon: Radio },
      { to: "/sender-id", label: "Sender ID", icon: Fingerprint },
      { to: "/documents", label: "Documents", icon: FolderOpen },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/invoicing", label: "Facturation", icon: Receipt },
      { to: "/payments", label: "Encaissements", icon: Wallet },
    ],
  },
  {
    label: "Pilotage",
    items: [
      { to: "/reports", label: "Rapports", icon: BarChart3 },
      { to: "/audit", label: "Audit", icon: ShieldCheck },
    ],
  },
  { label: "Système", items: [{ to: "/settings", label: "Paramètres", icon: Settings }] },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-ink text-white/90">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <img src={makorLogo} alt="Makor Telecoms" className="h-7 w-auto select-none" draggable={false} />
        <span className="rounded-md border border-white/15 px-1.5 py-0.5 font-mono-tabular text-[10px] font-semibold uppercase tracking-widest text-white/50">
          CRM
        </span>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-6">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/35">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          className="absolute inset-0 rounded-lg bg-white/10"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}
                      <Icon className="relative z-10 h-4 w-4 shrink-0" />
                      <span className="relative z-10">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-2 text-[11px] text-white/40">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />
          Passerelle SMS/WhatsApp connectée
        </div>
      </div>
    </aside>
  );
}
