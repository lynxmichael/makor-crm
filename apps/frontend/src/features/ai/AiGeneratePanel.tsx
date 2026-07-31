import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Loader2, RotateCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/Field";

import { aiService } from "@/services/collab";
import { EASE_OUT } from "@/lib/motion";
import type { ApiError } from "@/types/api";
import { AI_TASK_LABELS, type AiTaskType, type CommentEntityType } from "@/types/collab";

interface Props {
  taskType: AiTaskType;
  entityType: CommentEntityType;
  entityId: string;
  /** Appelé quand l'utilisateur retient le texte proposé. */
  onAccept: (text: string) => void;
}

/**
 * Proposition de rédaction (CDC §4.8, §4.9).
 *
 * Deux partis pris qui viennent de la conception du module :
 *  — le texte proposé n'est jamais appliqué automatiquement, il faut le
 *    retenir explicitement ;
 *  — aucun montant ne transite dans un sens ou dans l'autre. Le backend
 *    reconstruit le contexte chiffré depuis la base à chaque appel, donc
 *    l'interface n'a qu'un identifiant à fournir.
 */
export function AiGeneratePanel({ taskType, entityType, entityId, onAccept }: Props) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState<string | null>(null);

  const status = useQuery({
    queryKey: ["ai", "status"],
    queryFn: () => aiService.status(),
    // La configuration serveur ne change pas en cours de session.
    staleTime: Infinity,
  });

  const generate = useMutation({
    mutationFn: () =>
      aiService.generate({
        taskType,
        entityId,
        instruction: instruction.trim() || undefined,
      }),
    onSuccess: (generation) => setProposal(generation.output),
    onError: (error) => toast.error((error as ApiError).message),
  });

  const history = useQuery({
    queryKey: ["ai", "history", entityType, entityId],
    queryFn: () => aiService.history(entityType, entityId),
    enabled: open,
  });

  // Fonctionnalité dégradable : sans clé côté serveur, on n'affiche rien
  // plutôt qu'un bouton qui échouerait à chaque clic.
  if (status.isPending || !status.data?.enabled) return null;

  return (
    <div className="rounded-xl border border-wire/25 bg-wire/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <Sparkles className="h-4 w-4 text-wire" />
        <span className="font-display text-sm font-semibold text-ink">
          {AI_TASK_LABELS[taskType]}
        </span>
        <span className="ml-auto text-xs text-slate">
          {open ? "Masquer" : "Proposer un texte"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-wire/20 px-4 py-4">
              <Textarea
                rows={2}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Consigne facultative : ton, angle, points à mettre en avant…"
              />

              <p className="text-xs leading-relaxed text-slate">
                Les montants, quantités et dates sont repris tels quels depuis la fiche. Le texte
                proposé est à relire avant d'être retenu.
              </p>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => generate.mutate()}
                  disabled={generate.isPending}
                >
                  {generate.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {proposal ? "Proposer autre chose" : "Proposer un texte"}
                </Button>

                {history.data && history.data.length > 0 && (
                  <span className="self-center text-xs text-slate">
                    {history.data.length} proposition{history.data.length > 1 ? "s" : ""} déjà faite
                    {history.data.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <AnimatePresence>
                {proposal && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-lg border border-line bg-surface p-3"
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                      {proposal}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                      <Button
                        size="sm"
                        onClick={() => {
                          onAccept(proposal);
                          setProposal(null);
                          setOpen(false);
                          toast.success("Texte inséré — pensez à enregistrer la fiche");
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Retenir ce texte
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          void navigator.clipboard.writeText(proposal);
                          toast.success("Copié");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copier
                      </Button>

                      <Button size="sm" variant="ghost" onClick={() => generate.mutate()}>
                        <RotateCw className="h-3.5 w-3.5" />
                        Reformuler
                      </Button>

                      <Button size="sm" variant="ghost" onClick={() => setProposal(null)}>
                        <X className="h-3.5 w-3.5" />
                        Écarter
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
