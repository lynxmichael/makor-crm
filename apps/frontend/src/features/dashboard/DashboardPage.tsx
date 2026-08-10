import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarClock,
  Coins,
  FileText,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/DataState";
import { CommentThread } from "@/features/collaboration/CommentThread";
import { ManagerDashboard } from "./ManagerDashboard";
import { SupervisorDashboard } from "./SupervisorDashboard";
import { PeriodSelector, usePeriod } from "@/components/shared/PeriodSelector";

import { dashboardService } from "@/services/resources";
import { useAuthStore } from "@/store/auth.store";
import { QK, type RoleName } from "@/config/constants";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { formatDate, formatMoney } from "@/lib/format";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown>;

/**
 * Tableau de bord (CDC §4.2).
 *
 * Le backend n'expose pas une vue paramétrée mais cinq endpoints distincts,
 * chacun protégé par son propre `@Roles` et renvoyant une structure
 * différente. On résout donc la route depuis le rôle connecté, puis on rend
 * la vue correspondante — appeler la mauvaise route renvoie un 403, pas des
 * données vides.
 */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role?.name ?? "COMMERCIAL") as RoleName;

  // Le Financier pilote sur une période ; les autres profils gardent la vue
  // courante, où la notion de période n'apporte rien.
  const { period, setPeriod, range, label } = usePeriod("month");
  const usesPeriod = role === "MANAGER" || role === "SUPERVISEUR";

  const query = useQuery({
    queryKey: [...QK.dashboard, role, usesPeriod ? period : "all"],
    queryFn: () =>
      dashboardService.forRole(role, usesPeriod ? { from: range.from, to: range.to } : undefined),
    enabled: Boolean(user),
  });

  const firstName = user?.firstName ? String(user.firstName) : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {firstName ? `Bonjour ${firstName}` : "Tableau de bord"}
        </h1>
        <p className="mt-1 text-sm text-slate">
          {SUBTITLES[role] ?? "Vue d'ensemble de l'activité."}
        </p>

        {usesPeriod && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <PeriodSelector value={period} onChange={setPeriod} />
            <span className="text-xs text-slate">{label}</span>
          </div>
        )}
      </header>

      {query.isPending ? (
        <DashboardSkeleton />
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : (
        <DashboardBody role={role} data={query.data as Row} />
      )}

      {/* Fil du tableau de bord (CDC §4.1) — portée globale, sans entityId. */}
      <CommentThread
        entityType="DASHBOARD"
        title="Commentaires de l'équipe"
        emptyDetail="Partagez une lecture des chiffres, une alerte ou une consigne — tout le monde la verra ici."
      />
    </div>
  );
}

const SUBTITLES: Partial<Record<RoleName, string>> = {
  SUPER_ADMIN: "Vue consolidée de l'activité et des équipes.",
  ADMIN_VENTES: "Pilotage commercial : marge, pipeline et campagnes.",
  SUPERVISEUR: "Activité de votre équipe commerciale.",
  COMMERCIAL: "Votre portefeuille et vos prochaines échéances.",
  MANAGER: "Facturation, encaissements et délais de règlement.",
};

function DashboardBody({ role, data }: { role: RoleName; data: Row }) {
  switch (role) {
    case "SUPER_ADMIN":
      return <SuperAdminView data={data} />;
    case "ADMIN_VENTES":
      return <SalesAdminView data={data} />;
    case "MANAGER":
      return <ManagerDashboard data={data} />;
    case "SUPERVISEUR":
      return <SupervisorDashboard data={data} />;
    default:
      return <PortfolioView data={data} />;
  }
}

// ---------------------------------------------------------------------------
// Briques communes
// ---------------------------------------------------------------------------

function Kpi({
  label,
  value,
  icon: Icon,
  tone = "wire",
  hint,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  tone?: "wire" | "signal" | "alert" | "amber";
  hint?: string;
}) {
  const tints = {
    wire: "bg-wire/10 text-wire",
    signal: "bg-signal/10 text-signal",
    alert: "bg-alert/10 text-alert",
    amber: "bg-amber/10 text-amber",
  };

  return (
    <motion.article
      variants={staggerItem}
      className="kpi-sheen card-lift rounded-xl border border-line bg-surface p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
          <p className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink">
            {value}
          </p>
          {hint && <p className="mt-0.5 text-xs text-slate">{hint}</p>}
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tints[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </motion.article>
  );
}

function KpiGrid({ children }: { children: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      variants={reduced ? undefined : staggerContainer}
      initial="initial"
      animate="animate"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {children}
    </motion.div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center gap-2 border-b border-line px-5 py-3.5">
        <Icon className="h-4 w-4 text-slate" />
        <h2 className="font-display text-sm font-semibold text-ink">{title}</h2>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

const percent = (value: unknown) => `${(Number(value ?? 0) * 100).toFixed(1)} %`;

/** Bloc pipeline : partagé par le Super Admin et l'Admin ventes. */
function PipelinePanel({ pipeline }: { pipeline: Row }) {
  return (
    <Panel title="Qualité du pipeline" icon={Target}>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate">Taux de conversion</dt>
          <dd className="mt-1 font-display text-xl font-semibold text-ink">
            {percent(pipeline.conversionRate)}
          </dd>
          <dd className="text-xs text-slate">
            {String(pipeline.wonDeals ?? 0)} gagnées sur {String(pipeline.totalDeals ?? 0)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate">Affaire moyenne</dt>
          <dd className="mt-1 font-display text-xl font-semibold text-ink">
            {formatMoney(pipeline.averageDealSize as number)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate">Cycle de vente moyen</dt>
          <dd className="mt-1 font-display text-xl font-semibold text-ink">
            {String(pipeline.averageSalesCycleDays ?? 0)} j
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

/** Bloc marge : le backend renvoie `{ revenue, cost, margin }`. */
function RevenuePanel({ revenue }: { revenue: Row }) {
  const turnover = Number(revenue.revenue ?? 0);
  const margin = Number(revenue.margin ?? 0);

  return (
    <Panel title="Chiffre d'affaires et marge" icon={TrendingUp}>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-slate">Facturé</dt>
          <dd className="mt-1 font-display text-xl font-semibold text-ink">
            {formatMoney(turnover)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate">Coût d'acheminement</dt>
          <dd className="mt-1 font-display text-xl font-semibold text-ink">
            {formatMoney(revenue.cost as number)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate">Marge</dt>
          <dd className="mt-1 font-display text-xl font-semibold text-signal">
            {formatMoney(margin)}
          </dd>
          {turnover > 0 && (
            <dd className="text-xs text-slate">{((margin / turnover) * 100).toFixed(1)} % du CA</dd>
          )}
        </div>
      </dl>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Vues par profil
// ---------------------------------------------------------------------------

function SuperAdminView({ data }: { data: Row }) {
  const totals = (data.totals as Row) ?? {};
  const ranking = (data.transformationByCommercial as Row[]) ?? [];
  const commissions = (data.commissionsByCommercial as Row[]) ?? [];

  return (
    <div className="space-y-6">
      <KpiGrid>
        <Kpi label="Utilisateurs actifs" value={String(totals.activeUsers ?? 0)} icon={Users} />
        <Kpi label="Clients" value={String(totals.customers ?? 0)} icon={Building2} />
        <Kpi label="Opportunités" value={String(totals.deals ?? 0)} icon={Target} />
        <Kpi label="Campagnes" value={String(totals.campaigns ?? 0)} icon={Activity} />
      </KpiGrid>

      <KpiGrid>
        <Kpi label="Prospects" value={String(totals.leads ?? 0)} icon={Users} tone="amber" />
        <Kpi label="Factures proforma" value={String(totals.quotes ?? 0)} icon={FileText} tone="amber" />
        <Kpi label="Contrats" value={String(totals.contracts ?? 0)} icon={FileText} tone="signal" />
      </KpiGrid>

      {data.revenue ? <RevenuePanel revenue={data.revenue as Row} /> : null}
      {data.pipeline ? <PipelinePanel pipeline={data.pipeline as Row} /> : null}
      {ranking.length > 0 && <CommercialRanking rows={ranking} />}

      {commissions.length > 0 && <CommissionsByCommercial rows={commissions} />}
    </div>
  );
}

function SalesAdminView({ data }: { data: Row }) {
  const campaigns = (data.campaignVolumeByStatus as Row[]) ?? [];
  const signature = (data.quoteSignatureRate as Row) ?? {};

  return (
    <div className="space-y-6">
      {data.revenue ? <RevenuePanel revenue={data.revenue as Row} /> : null}
      {data.pipelineQuality ? <PipelinePanel pipeline={data.pipelineQuality as Row} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Signature des factures proforma" icon={FileText}>
          <p className="font-display text-3xl font-semibold text-ink">{percent(signature.rate)}</p>
          <p className="mt-1 text-sm text-slate">
            {String(signature.accepted ?? 0)} factures proforma acceptées sur {String(signature.sent ?? 0)}{" "}
            envoyés
          </p>
        </Panel>

        <Panel title="Campagnes par statut" icon={Activity}>
          {campaigns.length === 0 ? (
            <p className="text-sm text-slate">Aucune campagne sur la période.</p>
          ) : (
            <ul className="space-y-2">
              {campaigns.map((entry) => (
                <li key={String(entry.status)} className="flex items-center justify-between text-sm">
                  <Badge tone="neutral">{String(entry.status)}</Badge>
                  <span className="font-mono-tabular text-ink">{String(entry.count ?? 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}



function PortfolioView({ data }: { data: Row }) {
  const openDeals = (data.openDeals as Row[]) ?? [];
  const wonDeals = (data.wonDeals as Row[]) ?? [];
  const activities = (data.upcomingActivities as Row[]) ?? [];

  return (
    <div className="space-y-6">
      <KpiGrid>
        <Kpi label="Mes clients" value={String(data.customersCount ?? 0)} icon={Building2} />
        <Kpi label="Affaires en cours" value={String(openDeals.length)} icon={Target} tone="amber" />
        <Kpi label="Affaires gagnées" value={String(wonDeals.length)} icon={Trophy} tone="signal" />
        <Kpi label="Facture proforma créées" value={String(data.quotesCreated ?? 0)} icon={FileText} />
      </KpiGrid>

      {/* Commissions — ce qu'un commercial cherche en ouvrant son tableau de
          bord, après ses affaires. Réparti par statut : « en attente » est un
          montant calculé, pas un dû. */}
      {data.commissions ? <MyCommissions commissions={data.commissions as Row} /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Affaires en cours" icon={Target}>
          {openDeals.length === 0 ? (
            <p className="text-sm text-slate">Aucune affaire ouverte pour l'instant.</p>
          ) : (
            <ul className="space-y-3">
              {openDeals.slice(0, 6).map((deal) => {
                const stage = deal.stage as Row | undefined;
                const customer = deal.customer as Row | undefined;

                return (
                  <li key={String(deal.id)} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {String(deal.title ?? "")}
                      </p>
                      <p className="truncate text-xs text-slate">
                        {String(customer?.companyName ?? "Sans client")}
                        {stage?.name ? ` · ${String(stage.name)}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono-tabular text-sm text-ink">
                      {formatMoney(deal.amount as string)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Prochaines échéances" icon={CalendarClock}>
          {activities.length === 0 ? (
            <p className="text-sm text-slate">Rien de planifié dans les jours qui viennent.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((activity) => (
                <li key={String(activity.id)} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {String(activity.title ?? "")}
                    </p>
                    <p className="text-xs text-slate">{String(activity.type ?? "")}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate">
                    {activity.dueDate ? formatDate(activity.dueDate as string) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}



/**
 * Commissions par commercial, vue Super Admin.
 *
 * Trois colonnes distinctes plutôt qu'un total : c'est l'écart entre validé
 * et versé qui appelle une action, pas le cumul.
 */
function CommissionsByCommercial({ rows }: { rows: Row[] }) {
  const totals = rows.reduce(
    (acc, row) => ({
      pending: acc.pending + Number(row.pending ?? 0),
      payable: acc.payable + Number(row.payable ?? 0),
      paid: acc.paid + Number(row.paid ?? 0),
    }),
    { pending: 0, payable: 0, paid: 0 },
  );

  return (
    <Panel title="Commissions par commercial" icon={Coins}>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-slate">
              <th className="px-3 py-2">Commercial</th>
              <th className="px-3 py-2 text-right">En attente</th>
              <th className="px-3 py-2 text-right">À verser</th>
              <th className="px-3 py-2 text-right">Versé</th>
              <th className="px-3 py-2 text-right">Cumul</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const user = row.user as Row;
              const payable = Number(row.payable ?? 0);

              return (
                <tr key={String(user.id)} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wire/10 text-[10px] font-semibold text-wire">
                        {initials(String(user.firstName ?? ""), String(user.lastName ?? ""))}
                      </span>
                      <span className="text-ink">
                        {String(user.firstName ?? "")} {String(user.lastName ?? "")}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono-tabular text-slate">
                    {formatMoney(row.pending as number)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono-tabular ${
                      payable > 0 ? "font-medium text-signal" : "text-slate"
                    }`}
                  >
                    {formatMoney(payable)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono-tabular text-slate">
                    {formatMoney(row.paid as number)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono-tabular font-medium text-ink">
                    {formatMoney(row.total as number)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-line font-medium">
              <td className="px-3 py-2 text-ink">Total</td>
              <td className="px-3 py-2 text-right font-mono-tabular text-ink">
                {formatMoney(totals.pending)}
              </td>
              <td className="px-3 py-2 text-right font-mono-tabular text-signal">
                {formatMoney(totals.payable)}
              </td>
              <td className="px-3 py-2 text-right font-mono-tabular text-ink">
                {formatMoney(totals.paid)}
              </td>
              <td className="px-3 py-2 text-right font-mono-tabular text-ink">
                {formatMoney(totals.pending + totals.payable + totals.paid)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}

/**
 * Mes commissions, vue du commercial.
 *
 * Le montant mis en avant est celui qui est validé et pas encore payé : c'est
 * la question posée. Le total cumulé et les lignes en attente restent
 * visibles, mais au second plan.
 */
function MyCommissions({ commissions }: { commissions: Row }) {
  const pending = Number(commissions.pending ?? 0);
  const payable = Number(commissions.payable ?? 0);
  const paid = Number(commissions.paid ?? 0);
  const total = Number(commissions.total ?? 0);
  const lines = Number(commissions.lines ?? 0);

  if (lines === 0) {
    return (
      <Panel title="Mes commissions" icon={Coins}>
        <p className="text-sm leading-relaxed text-slate">
          Aucune commission pour l'instant. Elles se calculent sur les factures encaissées de vos
          clients, selon les barèmes en vigueur.
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Mes commissions" icon={Coins}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate">À percevoir</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-signal">
            {formatMoney(payable)}
          </p>
          <p className="mt-0.5 text-xs text-slate">
            Validé, en attente de versement
          </p>
        </div>

        <dl className="flex flex-wrap gap-6">
          <div>
            <dt className="text-xs text-slate">En attente de validation</dt>
            <dd className="mt-0.5 font-mono-tabular text-lg text-ink">{formatMoney(pending)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate">Déjà versé</dt>
            <dd className="mt-0.5 font-mono-tabular text-lg text-ink">{formatMoney(paid)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate">Cumul</dt>
            <dd className="mt-0.5 font-mono-tabular text-lg text-ink">{formatMoney(total)}</dd>
          </div>
        </dl>
      </div>

      {/* Répartition visuelle : la part déjà versée se distingue d'un coup. */}
      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-line">
        {(
          [
            [paid, "bg-signal"],
            [payable, "bg-wire"],
            [pending, "bg-amber"],
          ] as const
        ).map(([value, color], index) =>
          value > 0 && total > 0 ? (
            <span
              key={index}
              className={color}
              style={{ width: `${(value / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>

      <p className="mt-2 text-xs text-slate">
        {lines} ligne{lines > 1 ? "s" : ""} de commission · le détail est dans l'onglet
        Commissions.
      </p>
    </Panel>
  );
}

/**
 * Classement des commerciaux sur données observées (affaires gagnées, taux de
 * transformation). Ce n'est pas du scoring prédictif — celui-ci reste en V2
 * au CDC §5.
 */
function CommercialRanking({ rows }: { rows: Row[] }) {
  const sorted = [...rows].sort(
    (a, b) => Number(b.transformationRate ?? 0) - Number(a.transformationRate ?? 0),
  );

  return (
    <Panel title="Transformation par commercial" icon={BarChart3}>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-slate">
              <th className="px-3 py-2">Commercial</th>
              <th className="px-3 py-2 text-right">Affaires</th>
              <th className="px-3 py-2 text-right">Gagnées</th>
              <th className="px-3 py-2 text-right">Transformation</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => (
              <tr key={String(row.userId)} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    {index === 0 && <Trophy className="h-3.5 w-3.5 text-wire" />}
                    <span className="text-ink">{String(row.name ?? "")}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono-tabular">
                  {String(row.totalDeals ?? 0)}
                </td>
                <td className="px-3 py-2 text-right font-mono-tabular">
                  {String(row.wonDeals ?? 0)}
                </td>
                <td className="px-3 py-2 text-right font-mono-tabular text-ink">
                  {percent(row.transformationRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}
