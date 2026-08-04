import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/skeleton";

import { http } from "@/services/api";
import { QK } from "@/config/constants";
import { EASE_OUT } from "@/lib/motion";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

/**
 * Étapes du pipeline (CDC §4.6 — pipeline personnalisable par le Super Admin).
 *
 * La suppression est refusée par le serveur si des opportunités sont encore
 * rattachées à l'étape : il faut les déplacer d'abord. C'est le bon
 * comportement — supprimer une colonne pleine ferait disparaître des
 * affaires en cours de l'écran sans que personne ne le remarque.
 */
export function PipelineStagesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [color, setColor] = useState("#f39304");
  const [closedWon, setClosedWon] = useState(false);
  const [closedLost, setClosedLost] = useState(false);
  const [requiresSignedOrder, setRequiresSignedOrder] = useState(false);

  const stages = useQuery({
    queryKey: QK.pipelineStages,
    queryFn: () => http.get<Row[]>("/pipeline-stages"),
    enabled: open,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QK.pipelineStages });
    // Le tableau kanban est construit à partir des étapes : il doit suivre.
    queryClient.invalidateQueries({ queryKey: QK.deals });
  };

  const create = useMutation({
    mutationFn: () =>
      http.post("/pipeline-stages", {
        name: name.trim(),
        // L'ordre est unique en base : on prend la place suivante.
        order: (stages.data ?? []).length + 1,
        color,
        isClosedWon: closedWon,
        isClosedLost: closedLost,
        requiresSignedOrder,
      }),
    onSuccess: () => {
      toast.success("Étape ajoutée");
      setName("");
      setClosedWon(false);
      setClosedLost(false);
      setRequiresSignedOrder(false);
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => http.delete(`/pipeline-stages/${id}`),
    onSuccess: () => {
      toast.success("Étape supprimée");
      invalidate();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const rows = (stages.data ?? []).slice().sort((a, b) => Number(a.order) - Number(b.order));
  const canCreate = name.trim().length > 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Étapes du pipeline"
      description="L'ordre des étapes définit les colonnes du tableau, de gauche à droite."
      className="max-w-2xl"
    >
      <div className="space-y-6">
        <section className="space-y-4 rounded-xl border border-line bg-paper/50 p-4">
          <h3 className="font-display text-sm font-semibold text-ink">Nouvelle étape</h3>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <Field label="Nom" htmlFor="st-name" required>
                <Input
                  id="st-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Négociation"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canCreate) create.mutate();
                  }}
                />
              </Field>
            </div>

            <Field label="Couleur" htmlFor="st-color">
              <input
                id="st-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-lg border border-line bg-surface p-1"
              />
            </Field>
          </div>

          <div className="space-y-2">
            {(
              [
                [closedWon, setClosedWon, "Étape de clôture gagnée", "Les affaires qui y arrivent comptent comme des ventes."],
                [closedLost, setClosedLost, "Étape de clôture perdue", "Les affaires y sont considérées comme abandonnées."],
                [
                  requiresSignedOrder,
                  setRequiresSignedOrder,
                  "Exige un bon de commande signé",
                  "Une affaire ne peut y entrer sans bon de commande signé.",
                ],
              ] as const
            ).map(([checked, setter, label, hint]) => (
              <label key={label} className="flex cursor-pointer items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setter(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-line accent-wire"
                />
                <span>
                  <span className="text-ink">{label}</span>
                  <span className="block text-xs text-slate">{hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending || !canCreate}>
              {create.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Ajouter l'étape
            </Button>
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-display text-sm font-semibold text-ink">Étapes en place</h3>

          {stages.isPending ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="rounded-lg bg-paper px-3 py-6 text-center text-sm text-slate">
              Aucune étape. Le tableau du pipeline restera vide tant qu'il n'y en a pas.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              <AnimatePresence initial={false}>
                {rows.map((stage) => (
                  <motion.li
                    key={String(stage.id)}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: EASE_OUT }}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-line" />

                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: String(stage.color ?? "#6366f1") }}
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {String(stage.name ?? "")}
                      </span>
                      <span className="text-xs text-slate">Position {String(stage.order ?? "")}</span>
                    </span>

                    {stage.isClosedWon === true && <Badge tone="signal">Gagnée</Badge>}
                    {stage.isClosedLost === true && <Badge tone="alert">Perdue</Badge>}
                    {stage.requiresSignedOrder === true && <Badge tone="amber">BC signé requis</Badge>}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-alert hover:bg-alert/10"
                      onClick={() => remove.mutate(String(stage.id))}
                      disabled={remove.isPending}
                      aria-label={`Supprimer ${String(stage.name ?? "")}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          <p className="mt-2 text-xs leading-relaxed text-slate">
            Une étape contenant encore des opportunités ne peut pas être supprimée : déplacez-les
            d'abord vers une autre colonne.
          </p>
        </section>
      </div>
    </Modal>
  );
}
