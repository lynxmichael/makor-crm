import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/services/api";
import {
  CANONICAL_STAGE_LABELS,
  type BoardStage,
  type CreateDealInput,
} from "@/services/pipeline";

/**
 * Les champs restent des chaînes jusqu'à la soumission : un `<input>` ne
 * produit rien d'autre, et coercer dans le schéma brouillerait le typage du
 * formulaire sans rien apporter. La conversion se fait une fois, à l'envoi.
 */
const schema = z.object({
  title: z.string().trim().min(3, "L'intitulé comporte au moins 3 caractères."),

  amount: z
    .string()
    .min(1, "Le montant est requis.")
    .refine(
      (value) => Number(value) > 0,
      "Le montant doit être un nombre supérieur à zéro.",
    ),

  probability: z
    .string()
    .refine((value) => {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100;
    }, "La probabilité est un entier compris entre 0 et 100."),

  expectedCloseDate: z.string(),

  stageId: z.string().min(1, "Choisissez une étape de départ."),
});

type NewDealForm = z.infer<typeof schema>;

interface NewDealModalProps {
  open: boolean;
  onClose: () => void;
  /** Colonnes actives du pipeline, dans l'ordre d'affichage. */
  stages: BoardStage[];
  onCreate: (input: Omit<CreateDealInput, "assignedToId">) => Promise<unknown>;
}

export function NewDealModal({ open, onClose, stages, onCreate }: NewDealModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<NewDealForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      amount: "",
      probability: "20",
      expectedCloseDate: "",
      stageId: stages[0]?.id ?? "",
    },
  });

  // Réinitialise à chaque transition fermé → ouvert, sans passer par un effet.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setServerError(null);
      form.reset({
        title: "",
        amount: "",
        probability: "20",
        expectedCloseDate: "",
        stageId: stages[0]?.id ?? "",
      });
    }
  }

  async function onSubmit(values: NewDealForm) {
    setServerError(null);

    try {
      await onCreate({
        title: values.title.trim(),
        amount: Number(values.amount),
        probability: Number(values.probability),
        stageId: values.stageId,
        // Champ facultatif côté API : l'omettre vaut mieux que d'envoyer une
        // chaîne vide, que `@IsDateString()` rejetterait.
        ...(values.expectedCloseDate && {
          expectedCloseDate: new Date(values.expectedCloseDate).toISOString(),
        }),
      });

      onClose();
    } catch (error) {
      setServerError(errorMessage(error, "La création a échoué."));
    }
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle opportunité"
      description="Elle vous est affectée. Le rattachement à un client se fait depuis la fiche client."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="deal-title">Intitulé</Label>
          <Input
            id="deal-title"
            placeholder="Ex. Campagne SMS Marketing T3"
            aria-invalid={Boolean(errors.title)}
            {...form.register("title")}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-danger">{errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="deal-amount">Montant estimé (FCFA)</Label>
            <Input
              id="deal-amount"
              type="number"
              min={0}
              step={1000}
              placeholder="Ex. 5000000"
              aria-invalid={Boolean(errors.amount)}
              {...form.register("amount")}
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-danger">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="deal-probability">Probabilité (%)</Label>
            <Input
              id="deal-probability"
              type="number"
              min={0}
              max={100}
              aria-invalid={Boolean(errors.probability)}
              {...form.register("probability")}
            />
            {errors.probability && (
              <p className="mt-1 text-xs text-danger">{errors.probability.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="deal-stage">Étape de départ</Label>
            <Select
              id="deal-stage"
              aria-invalid={Boolean(errors.stageId)}
              {...form.register("stageId")}
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                  {stage.name !== CANONICAL_STAGE_LABELS[stage.canonicalStage] &&
                    ` — ${CANONICAL_STAGE_LABELS[stage.canonicalStage]}`}
                </option>
              ))}
            </Select>
            {errors.stageId && (
              <p className="mt-1 text-xs text-danger">{errors.stageId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="deal-close">Clôture prévue</Label>
            <Input
              id="deal-close"
              type="date"
              {...form.register("expectedCloseDate")}
            />
          </div>
        </div>

        {serverError && (
          <p role="alert" className="text-sm text-danger">
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer l'opportunité
          </Button>
        </div>
      </form>
    </Modal>
  );
}
