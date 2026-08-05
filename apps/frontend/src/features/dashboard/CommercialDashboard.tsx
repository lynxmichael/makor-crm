import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { AsyncBoundary } from "@/components/shared/AsyncBoundary";
import { Can } from "@/components/shared/Can";
import { KpiCard } from "@/components/shared/KpiCard";
import { formatCFA, formatDate, formatNumber } from "@/lib/utils";
import { fetchCommercialDashboard } from "@/services/dashboard";

/** Portefeuille, pipeline et agenda personnels — CDC §4.1, Commercial. */
export function CommercialDashboard() {
  const query = useQuery({
    queryKey: ["dashboard", "my-portfolio"],
    queryFn: fetchCommercialDashboard,
  });

  return (
    <AsyncBoundary {...query} onRetry={() => void query.refetch()}>
      {(data) => {
        const pipelineValue = data.openDeals.reduce(
          (sum, deal) => sum + Number(deal.amount ?? 0),
          0,
        );

        return (
          <div className="space-y-5">
            <div className="flex justify-end">
              <Can domain="pipeline">
                <Link to="/pipeline" className="btn btn-primary h-10 px-4 text-sm">
                  + Nouvelle opportunité
                </Link>
              </Can>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Mon portefeuille"
                value={formatNumber(data.customersCount)}
                hint="clients assignés"
              />
              <KpiCard
                label="Mes opportunités en cours"
                value={formatNumber(data.openDeals.length)}
                hint={formatCFA(pipelineValue)}
              />
              <KpiCard
                label="Mes affaires gagnées"
                value={formatNumber(data.wonDeals.length)}
              />
              <KpiCard label="Mes devis créés" value={formatNumber(data.quotesCreated)} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="card p-5">
                <h2 className="font-display text-base font-bold text-text">Mon pipeline</h2>
                <p className="mb-3 text-xs text-muted">Opportunités ouvertes, les plus récentes</p>

                {data.openDeals.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">
                    Aucune opportunité ouverte.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {data.openDeals.slice(0, 8).map((deal) => (
                      <li
                        key={deal.id}
                        className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text">{deal.title}</p>
                          <p className="truncate text-xs text-muted">
                            {deal.customer?.name ?? "Prospect"} · {deal.stage.name}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono-tabular font-semibold text-text">
                          {formatCFA(Number(deal.amount ?? 0))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card p-5">
                <h2 className="font-display text-base font-bold text-text">Mon agenda</h2>
                <p className="mb-3 text-xs text-muted">RDV et relances à venir</p>

                {data.upcomingActivities.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">
                    Rien de programmé pour l'instant.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {data.upcomingActivities.map((activity) => (
                      <li
                        key={activity.id}
                        className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text">{activity.subject}</p>
                          <p className="text-xs text-muted">{activity.type}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted">
                          {activity.dueDate ? formatDate(activity.dueDate) : "Sans échéance"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <p className="text-xs text-muted">
              Vous ne voyez que votre propre portefeuille — la vue d'équipe est réservée
              au Superviseur et à l'Admin ventes.
            </p>
          </div>
        );
      }}
    </AsyncBoundary>
  );
}
