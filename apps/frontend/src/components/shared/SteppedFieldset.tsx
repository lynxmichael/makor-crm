import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

export interface StepField {
  key: string;
  label: string;
  /** Une question facultative n'empêche pas de passer au palier suivant. */
  optional?: boolean;
  placeholder?: string;
}

interface Props {
  fields: StepField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Nombre de questions par palier. */
  chunkSize?: number;
  /** Appelé quand le dernier palier est complété. */
  onComplete?: () => void;
  /** Préfixe des clés, pour isoler les réponses d'une étape du pipeline. */
  keyPrefix?: string;
}

/**
 * Formulaire par paliers.
 *
 * Une grille de qualification peut compter vingt questions ; les afficher
 * d'un bloc pousse à survoler, et la longueur de la page décourage avant
 * même de commencer. On les sert donc par petits groupes, et le passage au
 * palier suivant est bloqué tant que le palier courant n'est pas complet.
 *
 * Les paliers déjà validés restent accessibles en arrière : verrouiller la
 * marche avant est un garde-fou, verrouiller la marche arrière serait une
 * punition — on doit pouvoir corriger une réponse donnée trop vite.
 */
export function SteppedFieldset({
  fields,
  values,
  onChange,
  chunkSize = 5,
  onComplete,
  keyPrefix = "",
}: Props) {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);

  const chunks = useMemo(() => {
    const result: StepField[][] = [];
    for (let i = 0; i < fields.length; i += chunkSize) {
      result.push(fields.slice(i, i + chunkSize));
    }
    return result;
  }, [fields, chunkSize]);

  const fullKey = (key: string) => (keyPrefix ? `${keyPrefix}.${key}` : key);

  const isAnswered = (field: StepField) =>
    field.optional || Boolean(values[fullKey(field.key)]?.trim());

  /** Un palier est franchi quand toutes ses questions obligatoires ont une réponse. */
  const isChunkComplete = (index: number) => chunks[index]?.every(isAnswered) ?? false;

  const current = chunks[step] ?? [];
  const canAdvance = isChunkComplete(step);
  const isLast = step === chunks.length - 1;

  const answeredTotal = fields.filter(isAnswered).length;
  const missingInStep = current.filter((field) => !isAnswered(field)).length;

  if (chunks.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Jauge de paliers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-ink">
            Série {step + 1} sur {chunks.length}
          </span>
          <span className="text-slate">
            {answeredTotal} / {fields.length} questions renseignées
          </span>
        </div>

        <div className="flex gap-1">
          {chunks.map((_, index) => {
            const done = isChunkComplete(index);
            const reachable = index <= step || done;

            return (
              <button
                key={index}
                type="button"
                // On ne saute pas vers un palier non encore atteint : c'est
                // exactement ce que le séquencement doit empêcher.
                disabled={!reachable}
                onClick={() => reachable && setStep(index)}
                aria-label={`Série ${index + 1}${done ? " — complétée" : ""}`}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  index === step
                    ? "bg-wire"
                    : done
                      ? "bg-signal"
                      : reachable
                        ? "bg-line hover:bg-slate/40"
                        : "bg-line",
                  !reachable && "cursor-not-allowed",
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Questions du palier courant */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={reduced ? false : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduced ? undefined : { opacity: 0, x: -12 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="space-y-4"
        >
          {current.map((field, index) => {
            const key = fullKey(field.key);
            const answered = isAnswered(field);

            return (
              <div key={field.key}>
                <label
                  htmlFor={key}
                  className="mb-1.5 flex items-start gap-2 text-sm font-medium text-ink"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-paper text-[11px] font-semibold text-slate">
                    {step * chunkSize + index + 1}
                  </span>
                  <span>
                    {field.label}
                    {!field.optional && <span className="ml-1 text-pulse">*</span>}
                  </span>
                  {answered && !field.optional && (
                    <Check className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-signal" />
                  )}
                </label>

                <Textarea
                  id={key}
                  rows={2}
                  value={values[key] ?? ""}
                  onChange={(e) => onChange(key, e.target.value)}
                  placeholder={field.placeholder ?? "Votre réponse…"}
                />
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <Button
          variant="ghost"
          size="sm"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ArrowLeft className="h-4 w-4" />
          Série précédente
        </Button>

        <div className="flex items-center gap-3">
          {!canAdvance && (
            <span className="flex items-center gap-1.5 text-xs text-slate">
              <Lock className="h-3.5 w-3.5" />
              {missingInStep} réponse{missingInStep > 1 ? "s" : ""} manquante
              {missingInStep > 1 ? "s" : ""}
            </span>
          )}

          {isLast ? (
            <Button size="sm" disabled={!canAdvance} onClick={onComplete}>
              <Check className="h-4 w-4" />
              Série terminée
            </Button>
          ) : (
            <Button size="sm" disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>
              Série suivante
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Une étape est franchie quand toutes ses questions obligatoires ont une réponse. */
export function isSectionComplete(
  fields: StepField[],
  values: Record<string, string>,
  keyPrefix = "",
): boolean {
  return fields.every(
    (field) =>
      field.optional ||
      Boolean(values[keyPrefix ? `${keyPrefix}.${field.key}` : field.key]?.trim()),
  );
}
