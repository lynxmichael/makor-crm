import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/skeleton";

import { http } from "@/services/api";
import { rolesService } from "@/services/resources";
import { QK, roleLabel } from "@/config/constants";
import { formatMoney } from "@/lib/format";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

const BASES: Record<string, string> = {
  SIGNED_AMOUNT: "Montant signé (HT)",
  COLLECTED_AMOUNT: "Montant encaissé",
  MARGIN: "Marge réalisée",
};

const TRIGGERS: Record<string, string> = {
  INVOICE_PAID: "Facture encaissée",
  PURCHASE_ORDER_SIGNED: "Bon de commande signé",
  CONTRACT_ACTIVATED: "Contrat activé",
};

export function CommissionPlanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [ratePercent, setRatePercent] = useState("5");
  const [base, setBase] = useState("SIGNED_AMOUNT");
  const [trigger, setTrigger] = useState("INVOICE_PAID");
  const [roleId, setRoleId] = useState("");
  const [minimumAmount, setMinimumAmount] = useState("");
  const [capAmount, setCapAmount] = useState("");

  const plans = useQuery({
    queryKey: ["commissions", "plans"],
    queryFn: () => http.get<Row[]>("/commissions/plans"),
    enabled: open,
  });

  const roles = useQuery({
    queryKey: QK.roles,
    queryFn: () => rolesService.all(),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () =>
      http.post("/commissions/plans", {
        name: name.trim(),
        // Le backend attend une fraction ; l'interface parle en pourcentage.
        rate: Number(ratePercent) / 100,
        base,
        trigger,
        ...(roleId ? { roleId } : {}),
        ...(minimumAmount ? { minimumAmount: Number(minimumAmount) } : {}),
        ...(capAmount ? { capAmount: Number(capAmount) } : {}),
      }),
    onSuccess: () => {
      toast.success("Barème créé");
      setName("");
      queryClient.invalidateQueries({ queryKey: ["commissions", "plans"] });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => http.delete(`/commissions/plans/${id}`),
    onSuccess: () => {
      toast.success("Barème retiré");
      queryClient.invalidateQueries({ queryKey: ["commissions", "plans"] });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const canSubmit = name.trim().length > 1 && Number(ratePercent) > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Barèmes de commissionnement"
      description="Un barème nominatif prime sur celui du rôle ; à défaut, le barème général s'applique."
      className="max-w-3xl"
    >
      <div className="space-y-6">
        <section className="space-y-4 rounded-xl border border-line bg-paper/50 p-4">
          <h3 className="font-display text-sm font-semibold text-ink">Nouveau barème</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" htmlFor="p-name" required>
              <Input
                id="p-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Commercial — standard"
              />
            </Field>

            <Field label="Taux (%)" htmlFor="p-rate" required>
              <Input
                id="p-rate"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={ratePercent}
                onChange={(e) => setRatePercent(e.target.value)}
              />
            </Field>

            <Field
              label="Assiette"
              htmlFor="p-base"
              hint="La marge suppose un coût de revient au catalogue."
            >
              <Select id="p-base" value={base} onChange={(e) => setBase(e.target.value)}>
                {Object.entries(BASES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Fait générateur" htmlFor="p-trigger">
              <Select id="p-trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
                {Object.entries(TRIGGERS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Rôle concerné" htmlFor="p-role" hint="Vide = tous les agents.">
              <Select id="p-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">Tous</option>
                {((roles.data as Row[]) ?? []).map((entry) => (
                  <option key={String(entry.id)} value={String(entry.id)}>
                    {roleLabel(entry as { name?: string; label?: string })}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Plancher" htmlFor="p-min" hint="FCFA">
                <Input
                  id="p-min"
                  type="number"
                  min={0}
                  value={minimumAmount}
                  onChange={(e) => setMinimumAmount(e.target.value)}
                  placeholder="—"
                />
              </Field>

              <Field label="Plafond" htmlFor="p-cap" hint="FCFA">
                <Input
                  id="p-cap"
                  type="number"
                  min={0}
                  value={capAmount}
                  onChange={(e) => setCapAmount(e.target.value)}
                  placeholder="—"
                />
              </Field>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending || !canSubmit}>
              {create.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Créer le barème
            </Button>
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-display text-sm font-semibold text-ink">Barèmes en vigueur</h3>

          {plans.isPending ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (plans.data ?? []).length === 0 ? (
            <p className="rounded-lg bg-paper px-3 py-6 text-center text-sm text-slate">
              Aucun barème défini. Sans barème actif, aucun calcul n'est possible.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {(plans.data ?? []).map((plan) => {
                const role = plan.role as Row | undefined;
                const user = plan.user as Row | undefined;

                return (
                  <li key={String(plan.id)} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-ink">
                        {String(plan.name ?? "")}
                        {plan.isActive === false && <Badge tone="neutral">Inactif</Badge>}
                      </p>
                      <p className="text-xs text-slate">
                        {(Number(plan.rate ?? 0) * 100).toFixed(1)} % ·{" "}
                        {BASES[String(plan.base)] ?? String(plan.base)} ·{" "}
                        {user
                          ? `${String(user.firstName ?? "")} ${String(user.lastName ?? "")}`
                          : role
                            ? roleLabel(role as { name?: string; label?: string })
                            : "Tous les agents"}
                        {plan.capAmount ? ` · plafond ${formatMoney(plan.capAmount as string)}` : ""}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-alert hover:bg-alert/10"
                      onClick={() => remove.mutate(String(plan.id))}
                      disabled={remove.isPending}
                      aria-label={`Retirer ${String(plan.name ?? "")}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
