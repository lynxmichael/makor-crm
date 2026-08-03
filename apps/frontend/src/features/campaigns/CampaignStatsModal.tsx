import { useQuery } from "@tanstack/react-query";

import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/DataState";

import { http } from "@/services/api";
import { QK } from "@/config/constants";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

interface Stats {
  total: number;
  processed: number;
  counts: Record<string, number>;
  deliveryRate: number;
  failureRate: number;
}

const RECIPIENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  SENT: "Envoyé",
  DELIVERED: "Remis",
  FAILED: "Échec",
  REJECTED: "Rejeté",
};

const RECIPIENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-line",
  SENT: "bg-wire",
  DELIVERED: "bg-signal",
  FAILED: "bg-alert",
  REJECTED: "bg-amber",
};

/** Une campagne en cours de traitement voit ses compteurs évoluer. */
const LIVE_STATUSES = ["QUEUED", "RUNNING"];

export function CampaignStatsModal({
  campaign,
  onClose,
}: {
  campaign: Row | null;
  onClose: () => void;
}) {
  const id = campaign ? String(campaign.id) : undefined;
  const live = LIVE_STATUSES.includes(String(campaign?.status ?? ""));

  const query = useQuery({
    queryKey: [...QK.campaigns, id, "stats"],
    queryFn: () => http.get<Stats>(`/campaigns/${id}/stats`),
    enabled: Boolean(id),
    refetchInterval: live ? 3_000 : false,
  });

  const stats = query.data;
  const percent = (value: number) => `${(value * 100).toFixed(1)} %`;

  return (
    <Modal
      open={Boolean(campaign)}
      onClose={onClose}
      title={String(campaign?.name ?? "")}
      description="Suivi de livraison"
      className="max-w-lg"
    >
      {query.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : stats ? (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-line bg-paper p-3">
              <p className="text-xs text-slate">Destinataires</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-line bg-paper p-3">
              <p className="text-xs text-slate">Taux de remise</p>
              <p className="mt-1 font-display text-xl font-semibold text-signal">
                {percent(stats.deliveryRate)}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-paper p-3">
              <p className="text-xs text-slate">Taux d'échec</p>
              <p
                className={`mt-1 font-display text-xl font-semibold ${
                  stats.failureRate > 0.1 ? "text-alert" : "text-ink"
                }`}
              >
                {percent(stats.failureRate)}
              </p>
            </div>
          </div>

          {/* Barre de progression : traité par rapport au total envoyé. */}
          {stats.total > 0 && (
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-slate">
                <span>Progression</span>
                <span className="font-mono-tabular">
                  {stats.processed} / {stats.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-wire transition-[width] duration-500"
                  style={{ width: `${(stats.processed / stats.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 font-display text-sm font-semibold text-ink">
              Répartition par statut
            </h3>
            <ul className="space-y-2">
              {Object.entries(stats.counts).map(([status, count]) => (
                <li key={status} className="flex items-center gap-3 text-sm">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      RECIPIENT_STATUS_COLORS[status] ?? "bg-line"
                    }`}
                  />
                  <span className="flex-1 text-slate">
                    {RECIPIENT_STATUS_LABELS[status] ?? status}
                  </span>
                  <span className="font-mono-tabular text-ink">{count}</span>
                  {stats.total > 0 && (
                    <span className="w-14 text-right font-mono-tabular text-xs text-slate">
                      {((count / stats.total) * 100).toFixed(1)} %
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {live && (
            <p className="text-xs text-slate">
              Envoi en cours — les compteurs se mettent à jour automatiquement.
            </p>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
