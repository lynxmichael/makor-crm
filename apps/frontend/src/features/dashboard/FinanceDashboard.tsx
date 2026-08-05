import { useQuery } from "@tanstack/react-query";

import { AsyncBoundary } from "@/components/shared/AsyncBoundary";
import { KpiCard } from "@/components/shared/KpiCard";
import { formatCFA, formatDays, formatNumber, formatRate } from "@/lib/utils";
import { fetchFinanceDashboard } from "@/services/dashboard";

/** Facturation, encaissements et recouvrement — CDC §4.1, rôle FINANCE. */
export function FinanceDashboard() {
  const query = useQuery({
    queryKey: ["dashboard", "finance"],
    queryFn: fetchFinanceDashboard,
  });

  return (
    <AsyncBoundary {...query} onRetry={() => void query.refetch()}>
      {(data) => {
        const recoveryRate = data.invoicesSentAmount
          ? data.paymentsReceivedAmount / data.invoicesSentAmount
          : 0;

        return (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Factures envoyées"
                value={formatNumber(data.invoicesSent)}
                hint={formatCFA(data.invoicesSentAmount)}
              />
              <KpiCard
                label="Encaissements"
                value={formatCFA(data.paymentsReceivedAmount)}
                hint={`${formatNumber(data.paymentsReceived)} règlements`}
              />
              <KpiCard
                label="Factures en retard"
                value={formatNumber(data.overdueInvoices)}
                delta={data.overdueInvoices > 0 ? "Action requise" : "Aucun retard"}
                deltaTone={data.overdueInvoices > 0 ? "down" : "up"}
              />
              <KpiCard
                label="Taux de recouvrement"
                value={formatRate(recoveryRate)}
                progress={recoveryRate * 100}
              />
            </div>

            <section className="card p-5">
              <h2 className="font-display text-base font-bold text-text">
                Délai moyen de règlement
              </h2>
              <p className="mb-3 text-xs text-muted">
                Entre l'émission de la facture et l'encaissement
              </p>
              <p className="font-display text-3xl font-extrabold text-text">
                {formatDays(data.averagePaymentDelayDays)}
              </p>
            </section>
          </div>
        );
      }}
    </AsyncBoundary>
  );
}
