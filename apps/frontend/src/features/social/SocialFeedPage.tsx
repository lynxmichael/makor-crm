import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCheck, ExternalLink, Radio, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/DataState";

import { http } from "@/services/api";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types/api";

interface Update {
  id: string;
  source: string;
  title: string;
  summary: string | null;
  link: string | null;
  fromAddress: string;
  receivedAt: string;
  isRead: boolean;
}

interface Payload {
  data: Update[];
  unread: number;
  bySource: { source: string; count: number }[];
}

const SOURCE_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
  SNAPCHAT: "Snapchat",
  X: "X",
  YOUTUBE: "YouTube",
  WHATSAPP_BUSINESS: "WhatsApp Business",
  GOOGLE: "Google",
  AUTRE: "Autre",
};

/** Couleur de la pastille : reconnaître la plateforme d'un coup d'œil. */
const SOURCE_COLORS: Record<string, string> = {
  FACEBOOK: "#1877F2",
  INSTAGRAM: "#E1306C",
  LINKEDIN: "#0A66C2",
  TIKTOK: "#000000",
  SNAPCHAT: "#FFFC00",
  X: "#1A1B2E",
  YOUTUBE: "#FF0000",
  WHATSAPP_BUSINESS: "#25D366",
  GOOGLE: "#4285F4",
  AUTRE: "#94A3B8",
};

/**
 * Veille des réseaux sociaux (demande du 13/08/2026).
 *
 * Les plateformes n'exposent pas leurs notifications personnelles par API :
 * elles les envoient par e-mail. Le CRM lit donc la boîte de réception, comme
 * le ferait Gmail, et rassemble ici ce qui en vient.
 */
export function SocialFeedPage() {
  const reduced = usePrefersReducedMotion();
  const queryClient = useQueryClient();

  const [source, setSource] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const query = useQuery({
    queryKey: ["social", source, unreadOnly],
    queryFn: () =>
      http.get<Payload>("/social", {
        params: {
          ...(source ? { source } : {}),
          ...(unreadOnly ? { unread: "1" } : {}),
        },
      }),
    // Une veille se rafraîchit d'elle-même : la relève tourne toutes les cinq
    // minutes côté serveur, l'écran s'aligne dessus.
    refetchInterval: 5 * 60 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["social"] });

  const markRead = useMutation({
    mutationFn: (id: string) => http.patch(`/social/${id}/read`),
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: () => http.patch("/social/read-all", null, { params: source ? { source } : {} }),
    onSuccess: (result) => {
      toast.success(`${(result as { updated: number }).updated} actualité(s) marquée(s) lue(s)`);
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const rows = query.data?.data ?? [];
  const unread = query.data?.unread ?? 0;
  const bySource = query.data?.bySource ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Actualités
          </h1>
          <p className="mt-1 text-sm text-slate">
            Notifications de vos pages sociales, rassemblées ici
            {unread > 0 && ` — ${unread} non lue${unread > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} />
            Actualiser
          </Button>

          {unread > 0 && (
            <Button onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              <CheckCheck className="h-4 w-4" />
              Tout marquer lu
            </Button>
          )}
        </div>
      </header>

      {/* Filtres par plateforme, avec le volume reçu de chacune. */}
      {bySource.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSource("")}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
              source === ""
                ? "border-wire bg-wire/10 text-wire"
                : "border-line bg-surface text-slate hover:text-ink",
            )}
          >
            Toutes
          </button>

          {bySource.map((entry) => (
            <button
              key={entry.source}
              type="button"
              onClick={() => setSource(entry.source)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                source === entry.source
                  ? "border-wire bg-wire/10 text-wire"
                  : "border-line bg-surface text-slate hover:text-ink",
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: SOURCE_COLORS[entry.source] ?? "#94A3B8" }}
              />
              {SOURCE_LABELS[entry.source] ?? entry.source}
              <span className="font-mono-tabular text-xs opacity-70">{entry.count}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setUnreadOnly((v) => !v)}
            className={cn(
              "ml-auto rounded-lg border px-3 py-1.5 text-sm transition-colors",
              unreadOnly
                ? "border-wire bg-wire/10 text-wire"
                : "border-line bg-surface text-slate hover:text-ink",
            )}
          >
            Non lues seulement
          </button>
        </div>
      )}

      {query.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="Aucune actualité"
          detail={
            unreadOnly || source
              ? "Rien ne correspond à ce filtre."
              : "Les notifications de vos pages arriveront ici dès que la boîte de réception en recevra. Vérifiez que l'adresse du CRM est bien celle inscrite sur vos comptes sociaux."
          }
        />
      ) : (
        <motion.ul
          variants={reduced ? undefined : staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-2"
        >
          {rows.map((update) => (
            <motion.li
              key={update.id}
              variants={reduced ? undefined : staggerItem}
              className={cn(
                "rounded-xl border bg-surface p-4 transition-colors",
                update.isRead ? "border-line" : "border-wire/40 bg-wire/[0.03]",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: SOURCE_COLORS[update.source] ?? "#94A3B8" }}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate">
                      {SOURCE_LABELS[update.source] ?? update.source}
                    </span>
                    <span className="text-xs text-slate">
                      {formatRelative(update.receivedAt)}
                    </span>
                    {!update.isRead && <Badge tone="wire">Nouveau</Badge>}
                  </div>

                  <p
                    className={cn(
                      "mt-1 text-sm",
                      update.isRead ? "text-ink" : "font-medium text-ink",
                    )}
                  >
                    {update.title}
                  </p>

                  {update.summary && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate">
                      {update.summary}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-1">
                  {update.link && (
                    <a
                      href={update.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markRead.mutate(update.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate transition-colors hover:bg-wire/10 hover:text-wire"
                      aria-label="Ouvrir sur la plateforme"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}

                  {!update.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markRead.mutate(update.id)}
                      aria-label="Marquer comme lu"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}

      <p className="rounded-xl border border-line bg-paper/50 px-4 py-3 text-xs leading-relaxed text-slate">
        Ces actualités proviennent des e-mails que les plateformes envoient à la boîte du CRM.
        Pour en recevoir davantage, inscrivez cette adresse sur vos comptes Facebook, LinkedIn,
        TikTok ou Instagram et activez leurs notifications par e-mail.
      </p>
    </div>
  );
}
