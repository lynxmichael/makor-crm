import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarClock,
  FileText,
  Receipt,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/DataState";
import { CommentThread } from "@/features/collaboration/CommentThread";

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

  const query = useQuery({
    queryKey: [...QK.dashboard, role],
    queryFn: () => dashboardService.forRole(role),
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
      return <ManagerView data={data} />;
    case "SUPERVISEUR":
      return <SupervisorView data={data} />;
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
        <Kpi label="Devis" value={String(totals.quotes ?? 0)} icon={FileText} tone="amber" />
        <Kpi
          label="Bons de commande"
          value={String(totals.purchaseOrders ?? 0)}
          icon={Receipt}
          tone="amber"
        />
        <Kpi label="Contrats" value={String(totals.contracts ?? 0)} icon={FileText} tone="signal" />
      </KpiGrid>

      {data.revenue ? <RevenuePanel revenue={data.revenue as Row} /> : null}
      {data.pipeline ? <PipelinePanel pipeline={data.pipeline as Row} /> : null}
      {ranking.length > 0 && <CommercialRanking rows={ranking} />}
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
        <Panel title="Signature des devis" icon={FileText}>
          <p className="font-display text-3xl font-semibold text-ink">{percent(signature.rate)}</p>
          <p className="mt-1 text-sm text-slate">
            {String(signature.accepted ?? 0)} devis acceptés sur {String(signature.sent ?? 0)}{" "}
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

function ManagerView({ data }: { data: Row }) {
  const overdue = Number(data.overdueInvoices ?? 0);

  return (
    <div className="space-y-6">
      <KpiGrid>
        <Kpi
          label="Factures émises"
          value={String(data.invoicesSent ?? 0)}
          hint={formatMoney(data.invoicesSentAmount as number)}
          icon={Receipt}
        />
        <Kpi
          label="Encaissements"
          value={String(data.paymentsReceived ?? 0)}
          hint={formatMoney(data.paymentsReceivedAmount as number)}
          icon={Wallet}
          tone="signal"
        />
        <Kpi
          label="Factures en retard"
          value={String(overdue)}
          icon={AlertTriangle}
          tone={overdue > 0 ? "alert" : "signal"}
        />
        <Kpi
          label="Délai moyen de règlement"
          value={`${String(data.averagePaymentDelayDays ?? 0)} j`}
          icon={CalendarClock}
          tone="amber"
        />
      </KpiGrid>

      {/* Reste à recouvrer : l'écart entre facturé et encaissé est le chiffre
          que le Financier surveille en premier. */}
      <Panel title="Reste à recouvrer" icon={TrendingUp}>
        <p className="font-display text-3xl font-semibold text-ink">
          {formatMoney(
            Number(data.invoicesSentAmount ?? 0) - Number(data.paymentsReceivedAmount ?? 0),
          )}
        </p>
        <p className="mt-1 text-sm text-slate">
          Écart entre le montant facturé et les encaissements aboutis sur la période.
        </p>
      </Panel>
    </div>
  );
}

function SupervisorView({ data }: { data: Row }) {
  // Le backend renvoie directement un tableau, une ligne par commercial.
  const rows = (Array.isArray(data) ? data : ((data as Row).team as Row[])) ?? [];

  if (rows.length === 0) {
    return (
      <Panel title="Équipe" icon={Users}>
        <p className="text-sm text-slate">Aucun commercial rattaché à votre équipe.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Activité de l'équipe" icon={Users}>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-slate">
              <th className="px-3 py-2">Commercial</th>
              <th className="px-3 py-2 text-right">RDV</th>
              <th className="px-3 py-2 text-right">Propositions</th>
              <th className="px-3 py-2 text-right">Bons de commande</th>
              <th className="px-3 py-2 text-right">Ventes</th>
              <th className="px-3 py-2 text-right">CA signé</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.userId)} className="border-b border-line last:border-0">
                <td className="px-3 py-2 text-ink">{String(row.name ?? "")}</td>
                <td className="px-3 py-2 text-right font-mono-tabular">
                  {String(row.meetings ?? 0)}
                </td>
                <td className="px-3 py-2 text-right font-mono-tabular">
                  {String(row.proposals ?? 0)}
                </td>
                <td className="px-3 py-2 text-right font-mono-tabular">
                  {String(row.purchaseOrders ?? 0)}
                </td>
                <td className="px-3 py-2 text-right font-mono-tabular">{String(row.sales ?? 0)}</td>
                <td className="px-3 py-2 text-right font-mono-tabular text-ink">
                  {formatMoney(row.salesValue as number)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
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
        <Kpi label="Devis créés" value={String(data.quotesCreated ?? 0)} icon={FileText} />
      </KpiGrid>

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
