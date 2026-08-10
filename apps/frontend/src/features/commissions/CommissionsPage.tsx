import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BadgeCheck, Calculator, Coins, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/DataState";

import { CommissionPlanModal } from "./CommissionPlanModal";
import { http } from "@/services/api";
import { useAuthStore } from "@/store/auth.store";
import { QK } from "@/config/constants";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { formatMoney, initials } from "@/lib/format";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Validée",
  PAID: "Payée",
  CANCELLED: "Annulée",
};

const STATUS_TONES: Record<string, "neutral" | "amber" | "signal" | "alert"> = {
  PENDING: "amber",
  APPROVED: "signal",
  PAID: "signal",
  CANCELLED: "alert",
};

/** Période courante au format AAAA-MM. */
function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export function CommissionsPage() {
  const reduced = usePrefersReducedMotion();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role?.name);

  const canManage = role === "SUPER_ADMIN" || role === "MANAGER";

  const [period, setPeriod] = useState(currentPeriod());
  const [planOpen, setPlanOpen] = useState(false);
  const [confirmCompute, setConfirmCompute] = useState(false);

  // Un commercial ne voit pas la synthèse d'équipe mais ses propres lignes :
  // une rémunération variable qu'on ne peut pas consulter soi-même engendre
  // plus de contestations qu'elle n'en évite.
  const mine = useQuery({
    queryKey: ["commissions", "mine"],
    queryFn: () => http.get<Row[]>("/commissions/mine"),
    enabled: !canManage,
  });

  const summary = useQuery({
    queryKey: ["commissions", "summary", period],
    queryFn: () => http.get<Row[]>("/commissions/summary", { params: { period } }),
    enabled: canManage,
  });

  const compute = useMutation({
    mutationFn: () => http.post<Row>("/commissions/compute", { period }),
    onSuccess: (result) => {
      toast.success(
        `${String(result.created ?? 0)} commission(s) calculée(s) — ${String(result.skipped ?? 0)} écartée(s)`,
      );
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      // Les commissions figurent maintenant sur les tableaux de bord :
      // un calcul ou une mise en paiement doit s'y répercuter.
      queryClient.invalidateQueries({ queryKey: QK.dashboard });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const transition = useMutation({
    mutationFn: (verb: "approve" | "pay") => http.post(`/commissions/${verb}`, { period }),
    onSuccess: (_data, verb) => {
      toast.success(verb === "approve" ? "Commissions validées" : "Commissions mises en paiement");
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      // Les commissions figurent maintenant sur les tableaux de bord :
      // un calcul ou une mise en paiement doit s'y répercuter.
      queryClient.invalidateQueries({ queryKey: QK.dashboard });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const rows = summary.data ?? [];
  const grandTotal = rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Commissions
          </h1>
          <p className="mt-1 text-sm text-slate">
            Calculées sur les factures encaissées de la période, selon les barèmes en vigueur.
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setPlanOpen(true)}>
              <Plus className="h-4 w-4" />
              Barèmes
            </Button>
            <Button onClick={() => setConfirmCompute(true)} disabled={compute.isPending}>
              <Calculator className="h-4 w-4" />
              Calculer la période
            </Button>
          </div>
        )}
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3">
        <div>
          <label htmlFor="c-period" className="mb-1.5 block text-xs font-medium text-slate">
            Période
          </label>
          <Input
            id="c-period"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-auto"
          />
        </div>

        {grandTotal > 0 && (
          <div className="ml-auto rounded-lg bg-paper px-4 py-2">
            <p className="text-xs text-slate">Total de la période</p>
            <p className="font-display text-xl font-semibold text-ink">
              {formatMoney(grandTotal)}
            </p>
          </div>
        )}
      </div>

      {!canManage ? (
        mine.isPending ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : mine.isError ? (
          <ErrorState error={mine.error as ApiError} onRetry={() => void mine.refetch()} />
        ) : (mine.data ?? []).length === 0 ? (
          <EmptyState
            icon={Coins}
            title="Aucune commission"
            detail="Vos commissions apparaîtront ici une fois les factures de vos clients encaissées."
          />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {(mine.data ?? []).map((line) => (
              <li key={String(line.id)} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{String(line.period ?? "")}</p>
                  <p className="text-xs text-slate">
                    {String((line.plan as Row | undefined)?.name ?? "")} ·{" "}
                    {(Number(line.rate ?? 0) * 100).toFixed(1)} % de{" "}
                    {formatMoney(line.baseAmount as string)}
                  </p>
                </div>

                <Badge tone={STATUS_TONES[String(line.status)] ?? "neutral"}>
                  {STATUS_LABELS[String(line.status)] ?? String(line.status)}
                </Badge>

                <span className="font-mono-tabular font-display text-lg font-semibold text-ink">
                  {formatMoney(line.amount as string)}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : summary.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : summary.isError ? (
        <ErrorState error={summary.error as ApiError} onRetry={() => void summary.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Coins}
          title="Aucune commission sur cette période"
          detail={
            canManage
              ? "Lancez le calcul : seules les factures déjà encaissées sont prises en compte."
              : "Aucune commission ne vous a encore été attribuée pour cette période."
          }
          action={
            canManage ? (
              <Button onClick={() => setConfirmCompute(true)}>
                <Calculator className="h-4 w-4" />
                Calculer la période
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <motion.div
            variants={reduced ? undefined : staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-3"
          >
            {rows.map((row) => {
              const user = row.user as Row;
              const byStatus = (row.byStatus as Record<string, number>) ?? {};

              return (
                <motion.article
                  key={String(user.id)}
                  variants={reduced ? undefined : staggerItem}
                  className="card-lift flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wire/10 text-sm font-semibold text-wire">
                    {initials(String(user.firstName ?? ""), String(user.lastName ?? ""))}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">
                      {String(user.firstName ?? "")} {String(user.lastName ?? "")}
                    </p>
                    <p className="text-xs text-slate">
                      {String(row.lines ?? 0)} ligne{Number(row.lines ?? 0) > 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(byStatus).map(([status, amount]) => (
                      <Badge key={status} tone={STATUS_TONES[status] ?? "neutral"}>
                        {STATUS_LABELS[status] ?? status} · {formatMoney(amount)}
                      </Badge>
                    ))}
                  </div>

                  <span className="font-mono-tabular font-display text-lg font-semibold text-ink">
                    {formatMoney(row.total as number)}
                  </span>
                </motion.article>
              );
            })}
          </motion.div>

          {canManage && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <Button
                variant="secondary"
                onClick={() => transition.mutate("approve")}
                disabled={transition.isPending}
              >
                <BadgeCheck className="h-4 w-4" />
                Valider les lignes en attente
              </Button>
              <Button onClick={() => transition.mutate("pay")} disabled={transition.isPending}>
                <Wallet className="h-4 w-4" />
                Marquer comme payées
              </Button>
            </div>
          )}
        </>
      )}

      <CommissionPlanModal open={planOpen} onClose={() => setPlanOpen(false)} />

      <Modal
        open={confirmCompute}
        onClose={() => setConfirmCompute(false)}
        title="Calculer les commissions ?"
        description={`Période ${period}`}
      >
        <p className="text-sm leading-relaxed text-slate">
          Seules les factures <strong>déjà encaissées</strong> sur la période sont retenues :
          commissionner un contrat signé mais impayé reviendrait à verser une prime sur un montant
          jamais perçu.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          L'opération peut être relancée sans risque : une même facture ne produit jamais deux
          lignes, et les commissions déjà validées ne sont pas recalculées.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmCompute(false)}>
            Annuler
          </Button>
          <Button
            disabled={compute.isPending}
            onClick={() => {
              compute.mutate();
              setConfirmCompute(false);
            }}
          >
            <Calculator className="h-4 w-4" />
            Lancer le calcul
          </Button>
        </div>
      </Modal>
    </div>
  );
}
