import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, LogOut, Menu, Search, Loader2, ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { QK, ROLE_LABELS } from "@/config/constants";
import { searchService, notificationsService } from "@/services/resources";
import { useAuthStore } from "@/store/auth.store";
import { useUiStore } from "@/store/ui.store";
import { formatRelative, initials } from "@/lib/format";
import { panelVariants } from "@/lib/motion";
import { useDebounced } from "@/hooks/use-debounced";

export function Topbar() {
  const navigate = useNavigate();
  const setMobileNav = useUiStore((s) => s.setMobileNav);

  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<"search" | "notifications" | "account" | null>(null);
  const containerRef = useRef<HTMLElement>(null);

  const debouncedQuery = useDebounced(query, 250);

  // Fermeture au clic extérieur et à Échap : deux gestes attendus,
  // absents = l'utilisateur se sent piégé dans le menu.
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setPanel(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPanel(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <header
      ref={containerRef}
      className="topbar-blur sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line px-4 sm:px-6"
    >
      <button
        onClick={() => setMobileNav(true)}
        className="rounded-lg p-2 text-slate transition-colors hover:bg-paper hover:text-ink lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <GlobalSearch
        query={query}
        onQueryChange={setQuery}
        debouncedQuery={debouncedQuery}
        open={panel === "search"}
        onOpen={() => setPanel("search")}
        onClose={() => setPanel(null)}
        onNavigate={(path) => {
          navigate(path);
          setQuery("");
          setPanel(null);
        }}
      />

      <div className="ml-auto flex items-center gap-1">
        <Notifications
          open={panel === "notifications"}
          onToggle={() => setPanel((p) => (p === "notifications" ? null : "notifications"))}
        />
        <AccountMenu
          open={panel === "account"}
          onToggle={() => setPanel((p) => (p === "account" ? null : "account"))}
        />
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Recherche globale (CDC §4.17)
// ---------------------------------------------------------------------------

interface SearchProps {
  query: string;
  debouncedQuery: string;
  open: boolean;
  onQueryChange: (value: string) => void;
  onOpen: () => void;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

/** Correspondance entre les familles renvoyées par /search et les écrans. */
const SEARCH_SECTIONS: { key: string; label: string; path: string; labelKey: string[] }[] = [
  { key: "customers", label: "Clients", path: "/clients", labelKey: ["companyName", "name"] },
  { key: "leads", label: "Prospects", path: "/prospects", labelKey: ["companyName", "name"] },
  { key: "deals", label: "Opportunités", path: "/opportunities", labelKey: ["title", "name"] },
  { key: "quotes", label: "Devis", path: "/quotes", labelKey: ["reference", "number"] },
  { key: "campaigns", label: "Campagnes", path: "/campaigns", labelKey: ["name"] },
];

function GlobalSearch({
  query,
  debouncedQuery,
  open,
  onQueryChange,
  onOpen,
  onClose,
  onNavigate,
}: SearchProps) {
  const enabled = debouncedQuery.trim().length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: [...QK.customers, "search", debouncedQuery],
    queryFn: () => searchService.global(debouncedQuery.trim()),
    enabled,
    staleTime: 15_000,
    meta: { silent: true },
  });

  const sections = SEARCH_SECTIONS.map((section) => ({
    ...section,
    rows: (Array.isArray(data?.[section.key]) ? data[section.key] : []).slice(0, 4),
  })).filter((section) => section.rows.length > 0);

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
      <Input
        placeholder="Rechercher un client, un devis, une opportunité…"
        className="pl-9"
        value={query}
        onFocus={onOpen}
        onChange={(e) => {
          onQueryChange(e.target.value);
          onOpen();
        }}
      />
      {isFetching && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate" />
      )}

      <AnimatePresence>
        {open && query.trim().length >= 2 && (
          <motion.div
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute left-0 top-11 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
          >
            {sections.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate">
                {isFetching ? "Recherche en cours…" : `Aucun résultat pour « ${query.trim()} »`}
              </p>
            ) : (
              <div className="max-h-[22rem] overflow-y-auto py-1.5">
                {sections.map((section) => (
                  <div key={section.key} className="px-1.5 py-1">
                    <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate">
                      {section.label}
                    </p>
                    {section.rows.map((row: Record<string, unknown>, i: number) => {
                      const label =
                        section.labelKey.map((k) => row[k]).find(Boolean) ?? "Sans titre";
                      return (
                        <button
                          key={String(row.id ?? i)}
                          onClick={() => onNavigate(section.path)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-paper"
                        >
                          <span className="truncate">{String(label)}</span>
                          {typeof row.code === "string" && (
                            <span className="shrink-0 font-mono-tabular text-xs text-slate">
                              {row.code}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications (CDC §4.14)
// ---------------------------------------------------------------------------

function Notifications({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: [...QK.notifications, "unread"],
    queryFn: () => notificationsService.list({ limit: 8 }),
    refetchInterval: 60_000,
    meta: { silent: true },
  });

  const rows = data?.data ?? [];
  const unread = rows.filter((n: Record<string, unknown>) => !n.isRead).length;

  async function markAllRead() {
    await Promise.all(
      rows
        .filter((n: Record<string, unknown>) => !n.isRead)
        .map((n: Record<string, unknown>) =>
          notificationsService.update(String(n.id), { isRead: true }).catch(() => undefined),
        ),
    );
    void queryClient.invalidateQueries({ queryKey: QK.notifications });
  }

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="relative rounded-lg p-2 text-slate transition-colors hover:bg-paper hover:text-ink"
        aria-label={unread > 0 ? `${unread} notifications non lues` : "Notifications"}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-pulse px-1 font-mono-tabular text-[10px] font-semibold text-white"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute right-0 top-11 w-80 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <p className="text-sm font-semibold text-ink">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium text-wire transition-colors hover:text-wire-dim"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            {rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate">
                Rien à signaler pour le moment.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {rows.map((n: Record<string, any>) => (
                  <div
                    key={String(n.id)}
                    className={cn(
                      "border-b border-line px-4 py-3 last:border-0",
                      !n.isRead && "bg-wire/[0.04]",
                    )}
                  >
                    <p className="text-sm font-medium text-ink">{n.title ?? "Notification"}</p>
                    {n.message && <p className="mt-0.5 text-xs leading-relaxed text-slate">{n.message}</p>}
                    <p className="mt-1 font-mono-tabular text-[11px] text-slate">
                      {formatRelative(n.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compte
// ---------------------------------------------------------------------------

function AccountMenu({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const twoFactorSetupRequired = useAuthStore((s) => s.twoFactorSetupRequired);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!user) return null;

  async function handleLogout() {
    await logout();
    // Le cache contient des données d'un autre utilisateur : on le vide,
    // sinon la prochaine connexion afficherait brièvement les siennes.
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-paper"
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-mono-tabular text-xs font-semibold text-white">
          {initials(user.firstName, user.lastName)}
          {twoFactorSetupRequired && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-amber" />
          )}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight text-ink">
            {user.firstName} {user.lastName}
          </span>
          <span className="block text-[11px] leading-tight text-slate">
            {ROLE_LABELS[user.role.name] ?? user.role.name}
          </span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute right-0 top-12 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
          >
            <div className="border-b border-line px-4 py-3">
              <p className="truncate text-sm font-medium text-ink">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-slate">{user.email}</p>
            </div>

            {twoFactorSetupRequired && (
              <button
                onClick={() => navigate("/settings")}
                className="flex w-full items-start gap-2.5 border-b border-line bg-amber/[0.06] px-4 py-3 text-left transition-colors hover:bg-amber/10"
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                <span>
                  <span className="block text-sm font-medium text-ink">Activez la double authentification</span>
                  <span className="block text-xs leading-relaxed text-slate">
                    Elle est requise pour votre rôle.
                  </span>
                </span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-ink transition-colors hover:bg-paper"
            >
              <LogOut className="h-4 w-4 text-slate" />
              Se déconnecter
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
