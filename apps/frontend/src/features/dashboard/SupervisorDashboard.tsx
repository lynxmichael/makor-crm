import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarCheck, FileText, Target, Trophy, Users } from "lucide-react";

import { formatMoney, formatMoneyCompact, initials } from "@/lib/format";

type Row = Record<string, unknown>;

/** Palette de l'entonnoir : plus on avance, plus la couleur s'affirme. */
const FUNNEL_COLORS = [
  "var(--color-slate)",
  "var(--color-amber)",
  "var(--color-wire)",
  "var(--color-signal)",
];

/** Couleurs du camembert, distinctes et lisibles en petit format. */
const SHARE_COLORS = [
  "var(--color-wire)",
  "var(--color-signal)",
  "var(--color-amber)",
  "var(--color-accent)",
  "#8b5cf6",
  "#0ea5e9",
  "#ec4899",
  "#14b8a6",
];

const AXIS = {
  stroke: "var(--color-slate)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({
  active,
  payload,
  money = false,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload?: Row }[];
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-e2">
      <p className="text-xs font-medium text-ink">
        {String(entry.payload?.stage ?? entry.payload?.name ?? entry.name)}
      </p>
      <p className="font-mono-tabular text-xs text-slate">
        {money ? formatMoney(entry.value) : entry.value}
      </p>
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
  icon: typeof Users;
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

/**
 * Tableau de bord du superviseur (demande du 07/08/2026).
 *
 * Ne présente que l'activité des commerciaux qu'il encadre : le service
 * filtre désormais sur le rôle, là où il remontait tous les comptes actifs.
 * Aucune donnée de facturation n'y figure — ce n'est pas son périmètre.
 */
export function SupervisorDashboard({ data }: { data: Row }) {
  // Compatibilité : l'ancienne route renvoyait un tableau nu.
  const team = (Array.isArray(data) ? data : ((data.team as Row[]) ?? [])) as Row[];
  const totals = (data.totals as Row) ?? {};
  const funnel = (data.funnel as Row[]) ?? [];

  if (team.length === 0) {
    return (
      <Panel title="Mon équipe" icon={Users}>
        <p className="text-sm leading-relaxed text-slate">
          Aucun commercial actif rattaché à votre équipe. Les comptes se créent depuis le module
          Comptes et accès, réservé au Super administrateur.
        </p>
      </Panel>
    );
  }

  const totalSalesValue = Number(totals.salesValue ?? 0);

  const shareData = team
    .filter((m) => Number(m.salesValue ?? 0) > 0)
    .map((m) => ({ name: String(m.name ?? ""), value: Number(m.salesValue ?? 0) }))
    .sort((a, b) => b.value - a.value);

  const ranked = [...team].sort(
    (a, b) => Number(b.salesValue ?? 0) - Number(a.salesValue ?? 0),
  );

  return (
    <div className="space-y-6">
      {/* Indicateurs d'équipe */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Commerciaux", String(totals.commercials ?? team.length), Users, "wire"],
            ["Rendez-vous", String(totals.meetings ?? 0), CalendarCheck, "wire"],
            ["Propositions", String(totals.proposals ?? 0), FileText, "amber"],
            ["Ventes", String(totals.sales ?? 0), Trophy, "signal"],
          ] as const
        ).map(([label, value, Icon, tone]) => (
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

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Entonnoir */}
        <Panel
          title="Entonnoir de l'équipe"
          icon={Target}
          hint="Où le travail se perd"
        >
          {funnel.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate">Aucune activité sur la période.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={funnel.map((f) => ({ stage: String(f.stage), Nombre: Number(f.count ?? 0) }))}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <XAxis type="number" {...AXIS} allowDecimals={false} />
                <YAxis type="category" dataKey="stage" {...AXIS} width={120} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-paper)" }} />
                <Bar dataKey="Nombre" radius={[0, 6, 6, 0]}>
                  {funnel.map((_, index) => (
                    <Cell key={index} fill={FUNNEL_COLORS[index] ?? "var(--color-signal)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Répartition du chiffre signé */}
        <Panel
          title="Part du chiffre signé"
          icon={Trophy}
          hint={formatMoneyCompact(totalSalesValue)}
        >
          {shareData.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate">
              Aucune vente signée sur la période.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <ResponsiveContainer width="100%" height={200} className="max-w-[220px]">
                <PieChart>
                  <Pie
                    data={shareData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                  >
                    {shareData.map((_, index) => (
                      <Cell key={index} fill={SHARE_COLORS[index % SHARE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip money />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Légende écrite plutôt que celle de recharts : les noms
                  complets y tiennent, et les montants restent lisibles. */}
              <ul className="min-w-[160px] flex-1 space-y-1.5">
                {shareData.map((entry, index) => (
                  <li key={entry.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: SHARE_COLORS[index % SHARE_COLORS.length] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-slate">{entry.name}</span>
                    <span className="font-mono-tabular text-xs text-ink">
                      {totalSalesValue > 0
                        ? `${((entry.value / totalSalesValue) * 100).toFixed(0)} %`
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      {/* Détail par commercial */}
      <Panel title="Activité par commercial" icon={Users}>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-slate">
                <th className="px-3 py-2">Commercial</th>
                <th className="px-3 py-2 text-right">RDV</th>
                <th className="px-3 py-2 text-right">Propositions</th>
                <th className="px-3 py-2 text-right">Ventes</th>
                <th className="px-3 py-2 text-right">Transformation</th>
                <th className="px-3 py-2 text-right">CA signé</th>
              </tr>
            </thead>

            <tbody>
              {ranked.map((member, index) => {
                const rate = Number(member.conversionRate ?? 0);

                return (
                  <tr key={String(member.userId)} className="border-b border-line last:border-0">
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        {index === 0 && Number(member.salesValue ?? 0) > 0 && (
                          <Trophy className="h-3.5 w-3.5 shrink-0 text-wire" />
                        )}
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wire/10 text-[10px] font-semibold text-wire">
                          {initials(
                            String(member.firstName ?? ""),
                            String(member.lastName ?? ""),
                          )}
                        </span>
                        <span className="text-ink">{String(member.name ?? "")}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono-tabular">
                      {String(member.meetings ?? 0)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono-tabular">
                      {String(member.proposals ?? 0)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono-tabular">
                      {String(member.sales ?? 0)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex items-center justify-end gap-2">
                        <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-line sm:block">
                          <span
                            className={`block h-full rounded-full ${
                              rate >= 0.5 ? "bg-signal" : rate >= 0.2 ? "bg-amber" : "bg-alert"
                            }`}
                            style={{ width: `${Math.min(100, Math.round(rate * 100))}%` }}
                          />
                        </span>
                        <span className="font-mono-tabular text-xs text-ink">
                          {(rate * 100).toFixed(0)} %
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono-tabular font-medium text-ink">
                      {formatMoney(member.salesValue as number)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate">
          Le taux de transformation rapporte les ventes aux rendez-vous pris : c'est lui qui
          distingue un commercial efficace d'un commercial simplement occupé.
        </p>
      </Panel>
    </div>
  );
}
