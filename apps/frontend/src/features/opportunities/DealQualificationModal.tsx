import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, List, Loader2, Lock, PencilLine } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SteppedFieldset, isSectionComplete } from "@/components/shared/SteppedFieldset";

import { dealsService } from "@/services/resources";
import { qualificationSections, goLiveChecklistItems } from "@/config/qualification";
import { QK } from "@/config/constants";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types/api";
import { CommentThread } from "@/features/collaboration/CommentThread";

type Row = Record<string, unknown> & { id?: unknown };

interface Props {
  deal: Row | null;
  onClose: () => void;
}

/**
 * Grille de qualification d'une opportunité (CDC §4.6).
 *
 * Deux niveaux de séquencement, l'un imbriqué dans l'autre :
 *  — à l'intérieur d'une étape, les questions arrivent par séries et le
 *    passage à la suivante exige que la série courante soit complète ;
 *  — entre les étapes, une étape reste verrouillée tant que celles qui la
 *    précèdent ne sont pas terminées.
 *
 * Les réponses sont persistées sur `Deal.qualification`, en JSON : les
 * questions relèvent de la méthode commerciale et évoluent sans migration.
 */
export function DealQualificationModal({ deal, onClose }: Props) {
  const queryClient = useQueryClient();

  const [openSection, setOpenSection] = useState<string | null>(null);
  const [view, setView] = useState<"form" | "table">("form");
  const [qualification, setQualification] = useState<Record<string, string>>({});
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!deal) return;

    setQualification((deal.qualification as Record<string, string>) ?? {});
    setChecklist((deal.goLiveChecklist as Record<string, boolean>) ?? {});

    // On ouvre la première étape incomplète : c'est là que le travail reprend.
    const answers = (deal.qualification as Record<string, string>) ?? {};
    const next = qualificationSections.find(
      (section) => !isSectionComplete(section.fields, answers, section.stage),
    );
    setOpenSection(next?.stage ?? "go_live");
  }, [deal]);

  const save = useMutation({
    mutationFn: () =>
      dealsService.update(String(deal!.id), { qualification, goLiveChecklist: checklist }),
    onSuccess: () => {
      toast.success("Qualification enregistrée");
      queryClient.invalidateQueries({ queryKey: QK.deals });
      onClose();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  if (!deal) return null;

  const customer = deal.customer as Row | undefined;
  const stage = deal.stage as Row | undefined;
  const checklistDone = goLiveChecklistItems.filter((item) => checklist[item.key]).length;

  return (
    <Modal
      open={Boolean(deal)}
      onClose={onClose}
      title={String(deal.title ?? "")}
      description={[
        String(customer?.companyName ?? "Sans client"),
        formatMoney(deal.amount as string),
        stage?.name ? `Étape : ${String(stage.name)}` : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      className="max-w-2xl"
    >
      <div className="space-y-3">
        {/* Deux lectures d'une même qualification : y répondre, ou la relire. */}
        <div className="flex gap-1 rounded-xl border border-line bg-paper p-1">
          {(
            [
              ["form", "Questionnaire", PencilLine],
              ["table", "Récapitulatif", List],
            ] as const
          ).map(([value, label, Glyph]) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                view === value ? "bg-surface text-ink shadow-e1" : "text-slate hover:text-ink",
              )}
            >
              <Glyph className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {view === "form" &&
          qualificationSections.map((section, index) => {
          const answered = section.fields.filter((field) =>
            qualification[`${section.stage}.${field.key}`]?.trim(),
          ).length;

          const complete = isSectionComplete(section.fields, qualification, section.stage);
          const previousComplete = qualificationSections
            .slice(0, index)
            .every((s) => isSectionComplete(s.fields, qualification, s.stage));

          const locked = !previousComplete && !complete;
          const isOpen = openSection === section.stage;

          return (
            <div
              key={section.stage}
              className={cn(
                "overflow-hidden rounded-xl border border-line",
                locked && "opacity-60",
              )}
            >
              <button
                type="button"
                disabled={locked}
                onClick={() => !locked && setOpenSection(isOpen ? null : section.stage)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
                  locked ? "cursor-not-allowed bg-paper/30" : "bg-paper/40 hover:bg-paper/70",
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {locked && <Lock className="h-3.5 w-3.5 shrink-0 text-slate" />}
                  <span className="truncate text-sm font-semibold text-ink">{section.title}</span>
                  {complete && <Check className="h-4 w-4 shrink-0 text-signal" />}
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  {locked ? (
                    <span className="text-[11px] text-slate">Étape précédente à compléter</span>
                  ) : (
                    <span className="font-mono-tabular text-[11px] text-slate">
                      {answered}/{section.fields.length}
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-line px-4 py-4">
                      <SteppedFieldset
                        fields={section.fields}
                        values={qualification}
                        keyPrefix={section.stage}
                        chunkSize={5}
                        onChange={(key, value) =>
                          setQualification((prev) => ({ ...prev, [key]: value }))
                        }
                        onComplete={() => {
                          const next = qualificationSections[index + 1];
                          setOpenSection(next ? next.stage : "go_live");
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Go live : liste de contrôle, pas de questions ouvertes */}
        <div className="overflow-hidden rounded-xl border border-line">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === "go_live" ? null : "go_live")}
            className="flex w-full items-center justify-between gap-3 bg-paper/40 px-4 py-3 text-left transition-colors hover:bg-paper/70"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">Go live — mise en service</span>
              {checklistDone === goLiveChecklistItems.length && (
                <Check className="h-4 w-4 text-signal" />
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono-tabular text-[11px] text-slate">
                {checklistDone}/{goLiveChecklistItems.length}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-slate transition-transform",
                  openSection === "go_live" && "rotate-180",
                )}
              />
            </div>
          </button>

          <AnimatePresence initial={false}>
            {openSection === "go_live" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="space-y-1 border-t border-line px-4 py-4">
                  {goLiveChecklistItems.map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-paper/60"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checklist[item.key])}
                        onChange={() =>
                          setChecklist((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                        }
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-wire"
                      />
                      <span
                        className={cn("text-sm", checklist[item.key] ? "text-ink" : "text-slate")}
                      >
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Récapitulatif : une fois les questions répondues, on veut les
            relire d'un bloc, pas rouvrir cinq accordéons. */}
        {view === "table" && (
          <div className="space-y-5">
            {qualificationSections.map((section) => {
              const answered = section.fields.filter(
                (f) => qualification[`${section.stage}.${f.key}`]?.trim(),
              );

              if (answered.length === 0) return null;

              return (
                <section key={section.stage}>
                  <h3 className="mb-2 font-display text-sm font-semibold text-ink">
                    {section.title}
                  </h3>

                  <div className="overflow-hidden rounded-xl border border-line">
                    <table className="w-full text-sm">
                      <tbody>
                        {answered.map((field) => (
                          <tr key={field.key} className="border-b border-line last:border-0">
                            <th
                              scope="row"
                              className="w-2/5 bg-paper/50 px-3 py-2 text-left align-top font-medium text-slate"
                            >
                              {field.label}
                            </th>
                            <td className="px-3 py-2 align-top whitespace-pre-wrap text-ink">
                              {qualification[`${section.stage}.${field.key}`]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}

            {Object.values(qualification).filter((v) => v?.trim()).length === 0 && (
              <p className="rounded-xl bg-paper px-4 py-8 text-center text-sm text-slate">
                Aucune réponse enregistrée pour l'instant. Passez en mode Questionnaire pour
                commencer la qualification.
              </p>
            )}
          </div>
        )}

        <CommentThread
          entityType="DEAL"
          entityId={String(deal.id)}
          emptyDetail="Notez ici ce que la grille ne capture pas : objection, contexte, décision prise en réunion."
        />

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <Badge tone="neutral">
            {qualificationSections.filter((s) =>
              isSectionComplete(s.fields, qualification, s.stage),
            ).length}{" "}
            / {qualificationSections.length} étapes complètes
          </Badge>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
              Fermer
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
