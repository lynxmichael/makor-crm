import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CalendarClock, Receipt, TrendingUp, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatMoney, formatMoneyCompact } from "@/lib/format";

type Row = Record<string, unknown>;

const METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  BANK_TRANSFER: "Virement",
  CARD: "Carte",
  MOBILE_MONEY: "Mobile Money",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  MOOV_MONEY: "Moov Money",
  CINETPAY: "CinetPay",
  STRIPE: "Stripe",
  PAYPAL: "PayPal",
};

/** Le rouge s'intensifie avec l'ancienneté de la créance. */
const AGING_COLORS = [
  "var(--color-slate)",
  "var(--color-signal)",
  "var(--color-amber)",
  "#e07e00",
  "var(--color-alert)",
];

const AXIS = {
  stroke: "var(--color-slate)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

/** Infobulle commune — celle de recharts ne connaît ni le FCFA ni nos couleurs. */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-e2">
      {label && <p className="mb-1 text-xs font-medium text-ink">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate">{entry.name}</span>
          <span className="font-mono-tabular text-ink">{formatMoney(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  hint,
}: {
  title: string;
  icon: typeof Receipt;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center gap-2 border-b border-line px-5 py-3.5">
        <Icon className="h-4 w-4 text-slate" />
        <h2 className="font-display text-sm font-semibold text-ink">{title}</h2>
        {hint && <span className="ml-auto text-xs text-slate">{hint}</span>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function ManagerDashboard({ data }: { data: Row }) {
  const invoiced = Number(data.invoicesSentAmount ?? 0);
  const collected = Number(data.paymentsReceivedAmount ?? 0);
  const outstanding = invoiced - collected;
  const overdue = Number(data.overdueInvoices ?? 0);

  const series = (data.series as Row[]) ?? [];
  const byMethod = (data.byMethod as Row[]) ?? [];
  const aging = (data.aging as Row[]) ?? [];

  const collectionRate = invoiced > 0 ? collected / invoiced : 0;

  const chartData = series.map((point) => {
    const [year, month] = String(point.period).split("-");
    return {
      label: new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(
        new Date(Number(year), Number(month) - 1, 1),
      ),
      Facturé: Number(point.invoiced ?? 0),
      Encaissé: Number(point.collected ?? 0),
    };
  });

  return (
    <div className="space-y-6">
      {/* Indicateurs de tête */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Facturé", formatMoney(invoiced), Receipt, "wire", `${data.invoicesSent ?? 0} facture(s)`],
            ["Encaissé", formatMoney(collected), Wallet, "signal", `${data.paymentsReceived ?? 0} versement(s)`],
            [
              "Reste à recouvrer",
              formatMoney(outstanding),
              TrendingUp,
              outstanding > 0 ? "amber" : "signal",
              `${(collectionRate * 100).toFixed(0)} % encaissé`,
            ],
            [
              "Factures en retard",
              String(overdue),
              AlertTriangle,
              overdue > 0 ? "alert" : "signal",
              `${data.averagePaymentDelayDays ?? 0} j de délai moyen`,
            ],
          ] as const
        ).map(([label, value, Icon, tone, hint]) => (
          <article
            key={label}
            className="kpi-sheen card-lift rounded-xl border border-line bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-slate">
                  {label}
                </p>
                <p className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink">
                  {value}
                </p>
                <p className="mt-0.5 text-xs text-slate">{hint}</p>
              </div>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-${tone}/10 text-${tone}`}
              >
                <Icon className="h-4 w-4" />
              </span>
            </div>
          </article>
        ))}
      </div>

      {/* Facturé contre encaissé */}
      <Panel
        title="Facturé et encaissé"
        icon={TrendingUp}
        hint="L'écart entre les deux courbes est votre créance"
      >
        {chartData.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate">
            Aucune donnée sur la période retenue.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gInvoiced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-wire)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-wire)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-signal)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-signal)" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
              <XAxis dataKey="label" {...AXIS} />
              <YAxis {...AXIS} tickFormatter={(v) => formatMoneyCompact(v)} width={70} />
              <Tooltip content={<ChartTooltip />} />

              <Area
                type="monotone"
                dataKey="Facturé"
                stroke="var(--color-wire)"
                strokeWidth={2}
                fill="url(#gInvoiced)"
              />
              <Area
                type="monotone"
                dataKey="Encaissé"
                stroke="var(--color-signal)"
                strokeWidth={2}
                fill="url(#gCollected)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Balance âgée */}
        <Panel
          title="Ancienneté des créances"
          icon={CalendarClock}
          hint="Ce qui reste dû, par retard"
        >
          {aging.every((b) => Number(b.amount ?? 0) === 0) ? (
            <p className="py-10 text-center text-sm text-signal">
              Aucune créance en cours. Tout est encaissé.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={aging.map((b) => ({
                  label: String(b.label),
                  Montant: Number(b.amount ?? 0),
                  count: Number(b.count ?? 0),
                }))}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" horizontal={false} />
                <XAxis type="number" {...AXIS} tickFormatter={(v) => formatMoneyCompact(v)} />
                <YAxis type="category" dataKey="label" {...AXIS} width={110} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-paper)" }} />
                <Bar dataKey="Montant" radius={[0, 6, 6, 0]}>
                  {aging.map((_, index) => (
                    <Cell key={index} fill={AGING_COLORS[index] ?? "var(--color-alert)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Moyens de paiement */}
        <Panel title="Moyens de paiement" icon={Wallet} hint="Sur la période">
          {byMethod.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate">
              Aucun encaissement sur la période.
            </p>
          ) : (
            <ul className="space-y-3">
              {byMethod.map((entry) => {
                const amount = Number(entry.amount ?? 0);
                const share = collected > 0 ? amount / collected : 0;

                return (
                  <li key={String(entry.method)}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-ink">
                        {METHOD_LABELS[String(entry.method)] ?? String(entry.method)}
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge tone="neutral">{String(entry.count ?? 0)}</Badge>
                        <span className="font-mono-tabular text-ink">{formatMoney(amount)}</span>
                      </span>
                    </div>
                    <span className="block h-1.5 overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full rounded-full bg-wire transition-[width] duration-500"
                        style={{ width: `${Math.round(share * 100)}%` }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
