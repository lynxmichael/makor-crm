import { useQuery } from "@tanstack/react-query";

import { AsyncBoundary } from "@/components/shared/AsyncBoundary";
import { KpiCard } from "@/components/shared/KpiCard";
import { formatCFA, formatNumber } from "@/lib/utils";
import { fetchSupervisorDashboard } from "@/services/dashboard";

/** Supervision de l'équipe commerciale — CDC §4.1, Superviseur. */
export function SuperviseurDashboard() {
  const query = useQuery({
    queryKey: ["dashboard", "supervisor"],
    queryFn: fetchSupervisorDashboard,
  });

  return (
    <AsyncBoundary {...query} onRetry={() => void query.refetch()}>
      {(rows) => {
        const total = rows.reduce(
          (acc, row) => ({
            meetings: acc.meetings + row.meetings,
            proposals: acc.proposals + row.proposals,
            purchaseOrders: acc.purchaseOrders + row.purchaseOrders,
            sales: acc.sales + row.sales,
            salesValue: acc.salesValue + row.salesValue,
          }),
          { meetings: 0, proposals: 0, purchaseOrders: 0, sales: 0, salesValue: 0 },
        );

        return (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="RDV réalisés" value={formatNumber(total.meetings)} />
              <KpiCard label="Propositions envoyées" value={formatNumber(total.proposals)} />
              <KpiCard label="Bons de commande" value={formatNumber(total.purchaseOrders)} />
              <KpiCard
                label="Ventes de l'équipe"
                value={formatNumber(total.sales)}
                hint={formatCFA(total.salesValue)}
              />
            </div>

            <section className="card p-5">
              <h2 className="font-display text-base font-bold text-text">
                Statistiques par commercial
              </h2>
              <p className="mb-3 text-xs text-muted">
                RDV, propositions, bons de commande et ventes
              </p>

              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">
                  Aucun commercial rattaché à votre équipe.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
                        <th className="py-2 font-bold">Commercial</th>
                        <th className="py-2 text-right font-bold">RDV</th>
                        <th className="py-2 text-right font-bold">Propositions</th>
                        <th className="py-2 text-right font-bold">BC</th>
                        <th className="py-2 text-right font-bold">Ventes</th>
                        <th className="py-2 text-right font-bold">Valeur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.userId} className="border-b border-border last:border-0">
                          <td className="py-2 text-text">{row.name}</td>
                          <td className="py-2 text-right font-mono-tabular text-muted">
                            {formatNumber(row.meetings)}
                          </td>
                          <td className="py-2 text-right font-mono-tabular text-muted">
                            {formatNumber(row.proposals)}
                          </td>
                          <td className="py-2 text-right font-mono-tabular text-muted">
                            {formatNumber(row.purchaseOrders)}
                          </td>
                          <td className="py-2 text-right font-mono-tabular text-muted">
                            {formatNumber(row.sales)}
                          </td>
                          <td className="py-2 text-right font-mono-tabular font-semibold text-text">
                            {formatCFA(row.salesValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        );
      }}
    </AsyncBoundary>
  );
}
