import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, Building2, Target, Radio, TriangleAlert, CheckCircle2, FileSignature } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { mockClients, mockOpportunities, mockCampaigns } from "@/data/mock";

interface NotificationItem {
  id: string;
  icon: typeof Bell;
  title: string;
  detail: string;
  time: string;
  read: boolean;
}

const initialNotifications: NotificationItem[] = [
  { id: "n1", icon: TriangleAlert, title: "Anomalie de campagne", detail: "« Promo rentrée scolaire » — délivrabilité à 76,2 %", time: "il y a 22 min", read: false },
  { id: "n2", icon: FileSignature, title: "Bon de commande signé", detail: "SGCI — BC-2607-041 · 12 300 000 FCFA", time: "il y a 2 h", read: false },
  { id: "n3", icon: Target, title: "Deal bloqué", detail: "Bank of Africa CI stagne à l'étape Prospect depuis 12 jours", time: "il y a 5 h", read: false },
  { id: "n4", icon: CheckCircle2, title: "Campagne terminée", detail: "« Notification sinistre » — 97,8 % de délivrabilité", time: "hier", read: true },
];

export function Topbar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { clients: [], opportunities: [], campaigns: [] };
    return {
      clients: mockClients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 3),
      opportunities: mockOpportunities.filter((o) => o.clientName.toLowerCase().includes(q)).slice(0, 3),
      campaigns: mockCampaigns.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 3),
    };
  }, [query]);

  const hasResults = results.clients.length + results.opportunities.length + results.campaigns.length > 0;

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  function goTo(path: string) {
    navigate(path);
    setSearchOpen(false);
    setQuery("");
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-6">
      <div ref={searchRef} className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
        <Input
          placeholder="Rechercher un client, un devis, une opportunité…"
          className="pl-9"
          value={query}
          onFocus={() => setSearchOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchOpen(true);
          }}
        />
        {searchOpen && query.trim() && (
          <div className="absolute left-0 top-11 z-40 w-full rounded-xl border border-line bg-surface shadow-lg">
            {!hasResults ? (
              <p className="px-4 py-6 text-center text-sm text-slate">Aucun résultat pour « {query} »</p>
            ) : (
              <div className="max-h-80 overflow-y-auto py-2">
                {results.clients.length > 0 && (
                  <div className="px-2 pb-1">
                    <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate">Clients</p>
                    {results.clients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => goTo("/clients")}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-paper"
                      >
                        <Building2 className="h-4 w-4 text-slate" />
                        <span className="text-ink">{c.name}</span>
                        <span className="ml-auto text-xs text-slate">{c.sector}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results.opportunities.length > 0 && (
                  <div className="px-2 pb-1">
                    <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate">Pipeline</p>
                    {results.opportunities.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => goTo("/opportunities")}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-paper"
                      >
                        <Target className="h-4 w-4 text-slate" />
                        <span className="text-ink">{o.clientName}</span>
                        <span className="ml-auto text-xs text-slate">{o.product}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results.campaigns.length > 0 && (
                  <div className="px-2 pb-1">
                    <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate">Campagnes</p>
                    {results.campaigns.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => goTo("/campaigns")}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-paper"
                      >
                        <Radio className="h-4 w-4 text-slate" />
                        <span className="text-ink">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div ref={notifRef} className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative rounded-full p-2 text-slate transition-colors hover:bg-paper hover:text-ink"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-pulse text-[9px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 z-40 w-80 rounded-xl border border-line bg-surface shadow-lg">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="text-sm font-semibold text-ink">Notifications</p>
                <button onClick={markAllRead} className="text-xs font-medium text-wire hover:text-wire-dim">
                  Tout marquer comme lu
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <button
                      key={n.id}
                      onClick={() =>
                        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
                      }
                      className="flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-paper"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-wire" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{n.title}</p>
                        <p className="truncate text-xs text-slate">{n.detail}</p>
                        <p className="mt-0.5 text-[11px] text-slate/70">{n.time}</p>
                      </div>
                      {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 border-l border-line pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-wire/10 font-display text-sm font-semibold text-wire">
            AK
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium text-ink">Aïcha Koné</p>
            <p className="text-xs text-slate">Admin ventes</p>
          </div>
        </div>
      </div>
    </header>
  );
}
