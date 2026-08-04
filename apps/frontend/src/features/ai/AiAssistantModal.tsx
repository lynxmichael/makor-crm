import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Loader2, RotateCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { EntitySelect } from "@/components/shared/EntitySelect";

import { aiService } from "@/services/collab";
import {
  campaignsService,
  contractsService,
  dealsService,
  quotesService,
} from "@/services/resources";
import { QK } from "@/config/constants";
import { formatMoney } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";
import type { ApiError } from "@/types/api";
import { AI_TASK_LABELS, type AiTaskType, type CommentEntityType } from "@/types/collab";

type Row = Record<string, unknown> & { id?: unknown };

/**
 * Chaque tâche porte sur une pièce précise : le serveur reconstruit le
 * contexte chiffré depuis la base, il faut donc lui dire laquelle.
 */
const TASK_SOURCES: Record<
  AiTaskType,
  { entityType: CommentEntityType; resource: "quotes" | "contracts" | "deals" | "campaigns"; hint: string }
> = {
  QUOTE_INTRO: {
    entityType: "QUOTE",
    resource: "quotes",
    hint: "Présente le besoin du client et le périmètre de la proposition.",
  },
  QUOTE_TERMS: {
    entityType: "QUOTE",
    resource: "quotes",
    hint: "Validité, règlement, délai de mise en service, engagement de qualité.",
  },
  CONTRACT_BODY: {
    entityType: "CONTRACT",
    resource: "contracts",
    hint: "Objet, périmètre, durée, obligations de chaque partie.",
  },
  CONTRACT_CLAUSE: {
    entityType: "CONTRACT",
    resource: "contracts",
    hint: "Une clause précise, à décrire dans la consigne ci-dessous.",
  },
  EMAIL_DRAFT: {
    entityType: "QUOTE",
    resource: "quotes",
    hint: "L'e-mail qui accompagne l'envoi du document au client.",
  },
  MEETING_SUMMARY: {
    entityType: "DEAL",
    resource: "deals",
    hint: "Le compte rendu d'un rendez-vous, à partir de vos notes.",
  },
  CAMPAIGN_MESSAGE: {
    entityType: "CAMPAIGN",
    resource: "campaigns",
    hint: "160 caractères sans accent, pour tenir en un seul segment facturé.",
  },
  CAMPAIGN_VARIANTS: {
    entityType: "CAMPAIGN",
    resource: "campaigns",
    hint: "Trois angles différents, à comparer avant de choisir.",
  },
};

const RESOURCES = {
  quotes: {
    service: quotesService,
    queryKey: QK.quotes,
    placeholder: "Rechercher un devis",
    render: (row: Row) => ({
      label: `${String(row.number ?? "")} — ${String(row.title ?? "")}`,
      detail: formatMoney(row.total as string),
    }),
  },
  contracts: {
    service: contractsService,
    queryKey: QK.contracts,
    placeholder: "Rechercher un contrat",
    render: (row: Row) => ({
      label: `${String(row.number ?? "")} — ${String(row.title ?? "")}`,
      detail: formatMoney(row.amount as string),
    }),
  },
  deals: {
    service: dealsService,
    queryKey: QK.deals,
    placeholder: "Rechercher une opportunité",
    render: (row: Row) => ({ label: String(row.title ?? "") }),
  },
  campaigns: {
    service: campaignsService,
    queryKey: QK.campaigns,
    placeholder: "Rechercher une campagne",
    render: (row: Row) => ({
      label: String(row.name ?? ""),
      detail: String(row.type ?? ""),
    }),
  },
} as const;

/**
 * Assistant de rédaction, accessible depuis la barre supérieure.
 *
 * L'aide à la rédaction n'était disponible qu'à l'intérieur des éditeurs de
 * devis et de contrat — donc invisible tant qu'on n'y était pas entré. Ce
 * point d'entrée la rend accessible depuis n'importe quel écran.
 *
 * Il ne s'agit pas d'une conversation libre : chaque tâche s'applique à une
 * pièce du CRM, dont le serveur relit les montants en base. Rien de chiffré
 * ne transite depuis le navigateur.
 */
export function AiAssistantModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [task, setTask] = useState<AiTaskType>("QUOTE_INTRO");
  const [entityId, setEntityId] = useState("");
  const [instruction, setInstruction] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const source = TASK_SOURCES[task];
  const resource = RESOURCES[source.resource];

  const status = useQuery({
    queryKey: ["ai", "status"],
    queryFn: () => aiService.status(),
    staleTime: Infinity,
    enabled: open,
  });

  const generate = useMutation({
    mutationFn: () =>
      aiService.generate({
        taskType: task,
        entityId,
        instruction: instruction.trim() || undefined,
      }),
    onSuccess: (result) => {
      setOutput(result.output);
      setCopied(false);
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assistant de rédaction"
      description="Propose un texte à partir d'une pièce du CRM. À relire avant usage."
      className="max-w-2xl"
    >
      {status.data && !status.data.enabled ? (
        <div className="rounded-xl bg-paper px-4 py-8 text-center">
          <Sparkles className="mx-auto mb-3 h-6 w-6 text-slate" />
          <p className="text-sm leading-relaxed text-slate">
            {status.data.detail ??
              "La génération assistée n'est pas configurée sur ce serveur."}
          </p>
          <p className="mt-2 text-xs text-slate">
            Renseignez <code className="font-mono-tabular">ANTHROPIC_API_KEY</code> côté backend,
            puis redémarrez le service.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <Field label="Que faut-il rédiger ?" htmlFor="ai-task" hint={source.hint}>
            <Select
              id="ai-task"
              value={task}
              onChange={(e) => {
                setTask(e.target.value as AiTaskType);
                // La pièce dépend de la tâche : un devis choisi pour une
                // introduction n'a pas de sens pour un corps de contrat.
                setEntityId("");
                setOutput(null);
              }}
            >
              {Object.entries(AI_TASK_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Sur quelle pièce ?"
            htmlFor="ai-entity"
            required
            hint="Les montants et dates sont relus en base par le serveur, jamais saisis ici."
          >
            <EntitySelect
              id="ai-entity"
              service={resource.service as never}
              queryKey={resource.queryKey}
              value={entityId}
              onChange={(id) => {
                setEntityId(id);
                setOutput(null);
              }}
              placeholder={resource.placeholder}
              render={resource.render}
            />
          </Field>

          <Field label="Consigne (facultative)" htmlFor="ai-instruction">
            <Textarea
              id="ai-instruction"
              rows={2}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Ton à adopter, points à mettre en avant, contraintes à rappeler…"
            />
          </Field>

          <Button
            onClick={() => generate.mutate()}
            disabled={generate.isPending || !entityId}
            className="w-full"
          >
            {generate.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {output ? "Proposer autre chose" : "Proposer un texte"}
          </Button>

          <AnimatePresence>
            {output && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.24, ease: EASE_OUT }}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <p className="scrollbar-thin max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {output}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(output);
                      setCopied(true);
                      toast.success("Texte copié");
                    }}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copié" : "Copier"}
                  </Button>

                  <Button size="sm" variant="ghost" onClick={() => generate.mutate()}>
                    <RotateCw className="h-3.5 w-3.5" />
                    Reformuler
                  </Button>

                  <Button size="sm" variant="ghost" onClick={() => setOutput(null)}>
                    <X className="h-3.5 w-3.5" />
                    Écarter
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-xs leading-relaxed text-slate">
            Le texte proposé est à relire. Les chiffres ne sont jamais calculés par l'assistant :
            il reprend ceux de la pièce, ou signale ce qui manque entre crochets.
          </p>
        </div>
      )}
    </Modal>
  );
}
