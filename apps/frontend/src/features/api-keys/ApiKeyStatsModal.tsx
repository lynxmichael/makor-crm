import { useQuery } from "@tanstack/react-query";

import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/DataState";

import { http } from "@/services/api";
import { formatDateTime } from "@/lib/format";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

interface Stats {
  periodDays: number;
  total: number;
  failed: number;
  errorRate: number;
  recent: Row[];
}

export function ApiKeyStatsModal({
  apiKey,
  onClose,
}: {
  apiKey: Row | null;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["api-keys", "stats", apiKey?.id],
    queryFn: () => http.get<Stats>(`/api-keys/${String(apiKey!.id)}/stats`),
    enabled: Boolean(apiKey),
  });

  return (
    <Modal
      open={Boolean(apiKey)}
      onClose={onClose}
      title={`Activité — ${String(apiKey?.name ?? "")}`}
      description={String(apiKey?.prefix ?? "")}
      className="max-w-3xl"
    >
      {query.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : (
        <div className="space-y-5">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-paper p-3">
              <dt className="text-xs text-slate">Appels ({query.data.periodDays} jours)</dt>
              <dd className="mt-1 font-display text-xl font-semibold text-ink">
                {query.data.total}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-paper p-3">
              <dt className="text-xs text-slate">En erreur</dt>
              <dd className="mt-1 font-display text-xl font-semibold text-ink">
                {query.data.failed}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-paper p-3">
              <dt className="text-xs text-slate">Taux d'erreur</dt>
              <dd
                className={`mt-1 font-display text-xl font-semibold ${
                  query.data.errorRate > 0.1 ? "text-alert" : "text-ink"
                }`}
              >
                {(query.data.errorRate * 100).toFixed(1)} %
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="mb-2 font-display text-sm font-semibold text-ink">Derniers appels</h3>

            {query.data.recent.length === 0 ? (
              <p className="rounded-lg bg-paper px-3 py-6 text-center text-sm text-slate">
                Cette clé n'a encore jamais été utilisée.
              </p>
            ) : (
              <div className="scrollbar-thin max-h-80 overflow-y-auto rounded-xl border border-line">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-paper">
                    <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-slate">
                      <th className="px-3 py-2">Horodatage</th>
                      <th className="px-3 py-2">Appel</th>
                      <th className="px-3 py-2 text-right">Durée</th>
                      <th className="px-3 py-2 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.recent.map((entry) => {
                      const status = Number(entry.status ?? 0);

                      return (
                        <tr key={String(entry.id)} className="border-b border-line last:border-0">
                          <td className="px-3 py-2 text-xs text-slate">
                            {formatDateTime(entry.createdAt as string)}
                          </td>
                          <td className="px-3 py-2 font-mono-tabular text-xs text-ink">
                            {String(entry.method ?? "")} {String(entry.path ?? "")}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-tabular text-xs text-slate">
                            {String(entry.durationMs ?? 0)} ms
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Badge tone={status >= 400 ? "alert" : "signal"}>{status}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
