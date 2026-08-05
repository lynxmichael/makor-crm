import { useQuery } from "@tanstack/react-query";

import { AsyncBoundary } from "@/components/shared/AsyncBoundary";
import { KpiCard } from "@/components/shared/KpiCard";
import { formatCFA, formatDays, formatNumber, formatRate } from "@/lib/utils";
import { fetchSalesAdminDashboard } from "@/services/dashboard";

/** Volumes, marges et qualité du pipeline — CDC §4.1, Admin ventes. */
export function AdminVentesDashboard() {
  const query = useQuery({
    queryKey: ["dashboard", "sales-admin"],
    queryFn: fetchSalesAdminDashboard,
  });

  return (
    <AsyncBoundary {...query} onRetry={() => void query.refetch()}>
      {(data) => (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Volume total" value={formatCFA(data.revenue.revenue)} />
            <KpiCard label="Marge totale" value={formatCFA(data.revenue.margin)} />
            <KpiCard
              label="Taille moyenne des opportunités"
              value={formatCFA(data.pipelineQuality.averageDealSize)}
            />
            <KpiCard
              label="Délai moyen de conclusion"
              value={formatDays(data.pipelineQuality.averageSalesCycleDays)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="font-display text-base font-bold text-text">
                Qualité du pipeline
              </h2>
              <p className="mb-3 text-xs text-muted">Sur la période courante</p>
              <dl className="space-y-2 text-sm">
                {(
                  [
                    ["Opportunités ouvertes", formatNumber(data.pipelineQuality.totalDeals)],
                    ["Gagnées", formatNumber(data.pipelineQuality.wonDeals)],
                    ["Perdues", formatNumber(data.pipelineQuality.lostDeals)],
                    ["Taux de conversion", formatRate(data.pipelineQuality.conversionRate)],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-border py-1.5">
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-mono-tabular font-semibold text-text">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="card p-5">
              <h2 className="font-display text-base font-bold text-text">
                Taux de signature des devis
              </h2>
              <p className="mb-3 text-xs text-muted">
                {formatNumber(data.quoteSignatureRate.accepted)} acceptés sur{" "}
                {formatNumber(data.quoteSignatureRate.sent)} envoyés
              </p>
              <p className="font-display text-3xl font-extrabold text-text">
                {formatRate(data.quoteSignatureRate.rate)}
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round(data.quoteSignatureRate.rate * 100)}%` }}
                />
              </div>

              <h3 className="mt-6 text-sm font-semibold text-text">
                Volumes de campagne par statut
              </h3>
              {data.campaignVolumeByStatus.length === 0 ? (
                <p className="py-4 text-sm text-muted">Aucun envoi sur la période.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {data.campaignVolumeByStatus.map((row) => (
                    <li
                      key={row.status}
                      className="flex justify-between border-b border-border py-1.5 last:border-0"
                    >
                      <span className="text-muted">{row.status}</span>
                      <span className="font-mono-tabular font-semibold text-text">
                        {formatNumber(row.count)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </AsyncBoundary>
  );
}
