import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, type ComponentPropsWithRef, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/services/api";
import {
  CANONICAL_STAGES,
  CANONICAL_STAGE_LABELS,
  type BoardStage,
  type StagePayload,
} from "@/services/pipeline";

/**
 * Couleur par défaut d'une nouvelle colonne — celle qu'applique le backend
 * quand `color` est omis (`pipeline-stages.service.ts`). La reprendre ici
 * évite qu'une étape créée depuis l'écran n'ait pas la même teinte qu'une
 * étape créée par l'API.
 */
const DEFAULT_COLOR = "#6366f1";

/**
 * Les bornes reprennent celles du DTO backend, pour que la saisie soit
 * refusée à l'écran plutôt qu'au retour d'un aller-retour réseau.
 */
const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Le libellé comporte au moins 2 caractères.")
      .max(60, "Le libellé ne dépasse pas 60 caractères."),

    canonicalStage: z.enum(CANONICAL_STAGES, {
      message: "Rattachez l'étape à l'une des étapes du cahier des charges.",
    }),

    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "La couleur s'écrit en hexadécimal, ex. #F39304."),

    isClosedWon: z.boolean(),
    isClosedLost: z.boolean(),
    requiresSignedOrder: z.boolean(),
  })
  // Le backend ne l'interdit pas, mais une colonne à la fois gagnante et
  // perdue rendrait tout taux de conversion incalculable.
  .refine((values) => !(values.isClosedWon && values.isClosedLost), {
    message: "Une étape ne peut pas clôturer à la fois en gain et en perte.",
    path: ["isClosedLost"],
  });

type StageForm = z.infer<typeof schema>;

function defaultsFor(stage: BoardStage | null): StageForm {
  return {
    name: stage?.name ?? "",
    canonicalStage: stage?.canonicalStage ?? "PROSPECT",
    color: stage?.color ?? DEFAULT_COLOR,
    isClosedWon: stage?.isClosedWon ?? false,
    isClosedLost: stage?.isClosedLost ?? false,
    requiresSignedOrder: stage?.requiresSignedOrder ?? false,
  };
}

interface StageFormModalProps {
  open: boolean;
  onClose: () => void;
  /** `null` : création. Renseignée : modification de cette colonne. */
  stage: BoardStage | null;
  onSubmit: (payload: StagePayload) => Promise<unknown>;
}

/**
 * Création et modification d'une colonne du Kanban (D24).
 *
 * `canonicalStage` est le seul champ dont dépend le reporting : le libellé est
 * libre et changeant, l'agrégation se fait sur le rattachement. Il est donc
 * obligatoire, et la modale l'explique plutôt que de le présenter comme un
 * champ de plus.
 */
export function StageFormModal({
  open,
  onClose,
  stage,
  onSubmit,
}: StageFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<StageForm>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor(stage),
  });

  // Réinitialise à chaque ouverture, sans passer par un effet : la modale sert
  // tour à tour la création et chacune des colonnes.
  const [shownFor, setShownFor] = useState<string | null>(null);
  const key = open ? (stage?.id ?? "creation") : null;

  if (key !== shownFor) {
    setShownFor(key);
    if (open) {
      setServerError(null);
      form.reset(defaultsFor(stage));
    }
  }

  async function submit(values: StageForm) {
    setServerError(null);

    try {
      await onSubmit({ ...values, name: values.name.trim() });
      onClose();
    } catch (error) {
      setServerError(
        errorMessage(
          error,
          stage ? "La modification a échoué." : "La création a échoué.",
        ),
      );
    }
  }

  const { errors, isSubmitting } = form.formState;

  // `useWatch` et non `form.watch()` : ce dernier renvoie une fonction que le
  // compilateur React ne peut pas mémoriser, et il renonce alors à optimiser
  // tout le composant.
  const color = useWatch({ control: form.control, name: "color" });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={stage ? `Modifier « ${stage.name} »` : "Nouvelle étape"}
      description="Le libellé s'affiche sur le Kanban ; le rattachement, lui, porte tout le reporting."
    >
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="stage-name">Libellé de la colonne</Label>
          <Input
            id="stage-name"
            placeholder="Ex. Négociation"
            aria-invalid={Boolean(errors.name)}
            {...form.register("name")}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="stage-canonical">Étape du cahier des charges</Label>
          <Select
            id="stage-canonical"
            aria-invalid={Boolean(errors.canonicalStage)}
            {...form.register("canonicalStage")}
          >
            {CANONICAL_STAGES.map((canonical) => (
              <option key={canonical} value={canonical}>
                {CANONICAL_STAGE_LABELS[canonical]}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">
            Le reporting agrège sur ce rattachement (CDC §4.6). Renommer la
            colonne ne le change pas ; le modifier, si.
          </p>
          {errors.canonicalStage && (
            <p className="mt-1 text-xs text-danger">
              {errors.canonicalStage.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="stage-color">Couleur du repère</Label>
          <div className="flex items-center gap-3">
            <input
              id="stage-color"
              type="color"
              className="field h-10 w-16 cursor-pointer p-1"
              {...form.register("color")}
            />
            <span className="font-mono-tabular text-xs uppercase text-muted">
              {color}
            </span>
          </div>
          {errors.color && (
            <p className="mt-1 text-xs text-danger">{errors.color.message}</p>
          )}
        </div>

        <fieldset className="space-y-2 rounded-xl border border-border px-3.5 py-3">
          <legend className="px-1 text-xs font-medium text-muted">
            Comportement de l'étape
          </legend>

          <Checkbox
            id="stage-won"
            label="Clôture l'affaire en gain"
            hint="Ses opportunités comptent dans le chiffre d'affaires."
            {...form.register("isClosedWon")}
          />

          <Checkbox
            id="stage-lost"
            label="Clôture l'affaire en perte"
            hint="Ses opportunités sortent du pipeline en cours."
            {...form.register("isClosedLost")}
          />

          <Checkbox
            id="stage-signed"
            label="Exige un bon de commande signé"
            hint="D5 — le déplacement vers cette colonne est refusé sans bon de commande signé, avec sa raison affichée."
            {...form.register("requiresSignedOrder")}
          />

          {errors.isClosedLost && (
            <p className="text-xs text-danger">{errors.isClosedLost.message}</p>
          )}
        </fieldset>

        {serverError && (
          <p role="alert" className="text-sm text-danger">
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {stage ? "Enregistrer" : "Créer l'étape"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * `ComponentPropsWithRef` et non `InputHTMLAttributes` : `form.register()`
 * renvoie une `ref` parmi ses propriétés, et React 19 la transmet comme
 * n'importe quelle autre — encore faut-il que le typage l'accepte.
 */
interface CheckboxProps extends ComponentPropsWithRef<"input"> {
  id: string;
  label: string;
  hint: ReactNode;
}

/**
 * Case à cocher avec sa justification. Les trois drapeaux d'une étape ont des
 * conséquences invisibles au moment de la saisie — une colonne « gagnante »
 * alimente le chiffre d'affaires — d'où l'explication systématique.
 */
const Checkbox = ({ id, label, hint, ...props }: CheckboxProps) => (
  <div className="flex gap-2.5">
    <input
      id={id}
      type="checkbox"
      className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
      {...props}
    />
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm text-text">
        {label}
      </label>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  </div>
);
