import { useQuery } from "@tanstack/react-query";

import { AsyncBoundary } from "@/components/shared/AsyncBoundary";
import { KpiCard } from "@/components/shared/KpiCard";
import { formatCFA, formatNumber, formatRate } from "@/lib/utils";
import { fetchSuperAdminDashboard } from "@/services/dashboard";

/** Vue consolidée tous profils — CDC §4.1, premier bloc. */
export function SuperAdminDashboard() {
  const query = useQuery({
    queryKey: ["dashboard", "super-admin"],
    queryFn: fetchSuperAdminDashboard,
  });

  return (
    <AsyncBoundary {...query} onRetry={() => void query.refetch()}>
      {(data) => (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="CA total (tous profils)"
              value={formatCFA(data.revenue.revenue)}
            />
            <KpiCard
              label="Taux de transformation moyen"
              value={formatRate(data.pipeline.conversionRate)}
              hint={`${formatNumber(data.pipeline.wonDeals)} gagnées sur ${formatNumber(data.pipeline.totalDeals)}`}
            />
            <KpiCard
              label="Taille moyenne des opportunités"
              value={formatCFA(data.pipeline.averageDealSize)}
            />
            <KpiCard
              label="Utilisateurs actifs"
              value={formatNumber(data.totals.activeUsers)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="font-display text-base font-bold text-text">
                Volumétrie du CRM
              </h2>
              <p className="mb-3 text-xs text-muted">Toutes entités confondues</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {(
                  [
                    ["Clients", data.totals.customers],
                    ["Prospects", data.totals.leads],
                    ["Opportunités", data.totals.deals],
                    ["Devis", data.totals.quotes],
                    ["Bons de commande", data.totals.purchaseOrders],
                    ["Contrats", data.totals.contracts],
                    ["Campagnes", data.totals.campaigns],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-border py-1.5">
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-mono-tabular font-semibold text-text">
                      {formatNumber(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="card p-5">
              <h2 className="font-display text-base font-bold text-text">
                Taux de transformation par commercial
              </h2>
              <p className="mb-3 text-xs text-muted">Opportunités gagnées sur ouvertes</p>
              {data.transformationByCommercial.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">
                  Aucune opportunité sur la période.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
                      <th className="py-2 font-bold">Commercial</th>
                      <th className="py-2 text-right font-bold">Gagnées</th>
                      <th className="py-2 text-right font-bold">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transformationByCommercial.map((row) => (
                      <tr key={row.userId} className="border-b border-border last:border-0">
                        <td className="py-2 text-text">{row.name}</td>
                        <td className="py-2 text-right font-mono-tabular text-muted">
                          {formatNumber(row.wonDeals)} / {formatNumber(row.totalDeals)}
                        </td>
                        <td className="py-2 text-right font-mono-tabular font-semibold text-text">
                          {formatRate(row.transformationRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </div>
      )}
    </AsyncBoundary>
  );
}
