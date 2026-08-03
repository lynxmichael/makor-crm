import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, Plus, Power, Trash2, Workflow, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/DataState";

import { WorkflowFormModal } from "./WorkflowFormModal";
import { WorkflowRunsModal } from "./WorkflowRunsModal";
import { TRIGGER_LABELS, ACTION_LABELS } from "./workflow-labels";
import { http } from "@/services/api";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

export function WorkflowsPage() {
  const reduced = usePrefersReducedMotion();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [runsFor, setRunsFor] = useState<Row | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);

  const query = useQuery({
    queryKey: ["workflows"],
    queryFn: () => http.get<Row[]>("/workflows"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      http.patch(`/workflows/${id}`, { isActive }),
    onSuccess: (_d, variables) => {
      toast.success(variables.isActive ? "Règle activée" : "Règle suspendue");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => http.delete(`/workflows/${id}`),
    onSuccess: () => {
      toast.success("Règle supprimée");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const workflows = query.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Automatisations
          </h1>
          <p className="mt-1 text-sm text-slate">
            Règles déclenchées par un événement du CRM : notifier, relancer, créer une tâche.
          </p>
        </div>

        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouvelle règle
        </Button>
      </header>

      {query.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : workflows.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="Aucune règle d'automatisation"
          detail="Par exemple : prévenir le superviseur dès qu'une affaire de plus d'un million bascule en négociation."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouvelle règle
            </Button>
          }
        />
      ) : (
        <motion.div
          variants={reduced ? undefined : staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-3"
        >
          {workflows.map((workflow) => {
            const actions = (workflow.actions as Row[]) ?? [];
            const conditions = (workflow.conditions as unknown[]) ?? [];
            const isActive = workflow.isActive !== false;
            const runCount = ((workflow._count as Row)?.runs as number) ?? 0;

            return (
              <motion.article
                key={String(workflow.id)}
                variants={reduced ? undefined : staggerItem}
                className={`card-lift rounded-xl border border-line bg-surface p-4 ${
                  isActive ? "" : "opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? "bg-wire/10 text-wire" : "bg-paper text-slate"
                    }`}
                  >
                    <Zap className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-sm font-semibold text-ink">
                      {String(workflow.name ?? "")}
                    </h2>
                    {workflow.description && (
                      <p className="mt-0.5 text-xs text-slate">{String(workflow.description)}</p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge tone="wire">
                        {TRIGGER_LABELS[String(workflow.trigger)] ?? String(workflow.trigger)}
                      </Badge>

                      {conditions.length > 0 && (
                        <Badge tone="neutral">
                          {conditions.length} condition{conditions.length > 1 ? "s" : ""}
                        </Badge>
                      )}

                      <span className="text-slate">→</span>

                      {actions.map((action) => (
                        <Badge key={String(action.id)} tone="signal">
                          {ACTION_LABELS[String(action.type)] ?? String(action.type)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRunsFor(workflow)}
                      aria-label="Journal d'exécution"
                    >
                      <Activity className="h-4 w-4" />
                      {runCount > 0 && <span className="text-xs">{runCount}</span>}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className={isActive ? "text-amber hover:bg-amber/10" : "text-signal hover:bg-signal/10"}
                      onClick={() =>
                        toggle.mutate({ id: String(workflow.id), isActive: !isActive })
                      }
                      aria-label={isActive ? "Suspendre" : "Activer"}
                    >
                      <Power className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-alert hover:bg-alert/10"
                      onClick={() => setToDelete(workflow)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}

      <WorkflowFormModal open={formOpen} onClose={() => setFormOpen(false)} />
      <WorkflowRunsModal workflow={runsFor} onClose={() => setRunsFor(null)} />

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Supprimer cette règle ?"
        description={String(toDelete?.name ?? "")}
      >
        <p className="text-sm leading-relaxed text-slate">
          Son journal d'exécution disparaît avec elle. Pour la neutraliser sans perdre
          l'historique, suspendez-la plutôt que de la supprimer.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)} disabled={remove.isPending}>
            Annuler
          </Button>
          <Button
            variant="danger"
            disabled={remove.isPending}
            onClick={async () => {
              if (toDelete) await remove.mutateAsync(String(toDelete.id));
              setToDelete(null);
            }}
          >
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
