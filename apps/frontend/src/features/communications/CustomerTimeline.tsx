import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarClock,
  FileSignature,
  FileText,
  FolderOpen,
  MessageSquare,
  Radio,
  Receipt,
  ShoppingCart,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/DataState";

import { http } from "@/services/api";
import { formatDateTime, formatMoney } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import type { ApiError } from "@/types/api";

interface TimelineEntry {
  id: string;
  kind: string;
  at: string;
  title: string;
  detail?: string;
  actor?: string;
  status?: string;
  amount?: number;
}

const KIND_ICONS: Record<string, typeof FileText> = {
  ACTIVITY: CalendarClock,
  CAMPAIGN: Radio,
  QUOTE: FileText,
  PURCHASE_ORDER: ShoppingCart,
  CONTRACT: FileSignature,
  INVOICE: Receipt,
  PAYMENT: Wallet,
  COMMENT: MessageSquare,
  SIGNATURE: FileSignature,
  DOCUMENT: FolderOpen,
};

const KIND_TINTS: Record<string, string> = {
  ACTIVITY: "bg-wire/10 text-wire",
  CAMPAIGN: "bg-info/10 text-info",
  QUOTE: "bg-amber/10 text-amber",
  PURCHASE_ORDER: "bg-amber/10 text-amber",
  CONTRACT: "bg-signal/10 text-signal",
  INVOICE: "bg-signal/10 text-signal",
  PAYMENT: "bg-signal/10 text-signal",
  COMMENT: "bg-paper text-slate",
  SIGNATURE: "bg-signal/10 text-signal",
  DOCUMENT: "bg-paper text-slate",
};

/**
 * Fil unifié des échanges avec un client (CDC §5 — V2).
 *
 * Rassemble sur une seule ligne de temps ce qui était jusqu'ici éparpillé
 * entre sept écrans : rendez-vous, campagnes, devis, commandes, contrats,
 * factures, encaissements, commentaires et documents.
 *
 * Les e-mails entrants n'y figurent pas : le backend ne sait pas encore les
 * recevoir, faute d'un webhook fournisseur ou d'une relève IMAP. C'est la
 * seule brique manquante pour que le fil soit réellement complet.
 */
export function CustomerTimeline({ customerId }: { customerId: string }) {
  const reduced = usePrefersReducedMotion();

  const query = useQuery({
    queryKey: ["communications", "timeline", customerId],
    queryFn: () =>
      http.get<TimelineEntry[]>(`/communications/customers/${customerId}/timeline`),
    enabled: Boolean(customerId),
  });

  const entries = query.data ?? [];

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center gap-2 border-b border-line px-5 py-3.5">
        <CalendarClock className="h-4 w-4 text-slate" />
        <h2 className="font-display text-sm font-semibold text-ink">Historique des échanges</h2>
        {entries.length > 0 && (
          <span className="rounded-full bg-paper px-2 py-0.5 text-xs font-medium text-slate">
            {entries.length}
          </span>
        )}
      </header>

      <div className="px-5 py-4">
        {query.isPending ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Aucun échange enregistré"
            detail="Les rendez-vous, devis, factures et campagnes liés à ce client apparaîtront ici au fil de la relation."
          />
        ) : (
          <motion.ol
            variants={reduced ? undefined : staggerContainer}
            initial="initial"
            animate="animate"
            className="relative space-y-4"
          >
            {/* Filet vertical reliant les jalons — il rend la chronologie
                lisible d'un coup d'œil, là où une liste plate ne le fait pas. */}
            <span
              aria-hidden
              className="absolute bottom-2 left-4 top-2 w-px bg-line"
            />

            {entries.map((entry) => {
              const Icon = KIND_ICONS[entry.kind] ?? FileText;

              return (
                <motion.li
                  key={`${entry.kind}-${entry.id}`}
                  variants={reduced ? undefined : staggerItem}
                  className="relative flex gap-3"
                >
                  <span
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-surface ${
                      KIND_TINTS[entry.kind] ?? "bg-paper text-slate"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium text-ink">{entry.title}</span>

                      {entry.status && <Badge tone="neutral">{entry.status}</Badge>}

                      {entry.amount !== undefined && entry.amount !== null && (
                        <span className="font-mono-tabular text-sm text-ink">
                          {formatMoney(entry.amount)}
                        </span>
                      )}
                    </div>

                    {entry.detail && (
                      <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-slate">
                        {entry.detail}
                      </p>
                    )}

                    <p className="mt-0.5 text-xs text-slate">
                      {formatDateTime(entry.at)}
                      {entry.actor && ` · ${entry.actor}`}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </motion.ol>
        )}
      </div>
    </section>
  );
}
