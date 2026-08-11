import { Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/services/api";
import {
  CANONICAL_STAGE_LABELS,
  type BoardStage,
  type RemoveStageResult,
} from "@/services/pipeline";

interface RemoveStageModalProps {
  open: boolean;
  onClose: () => void;
  /** Colonne visée par le retrait. */
  stage: BoardStage | null;
  /** Nombre d'opportunités qu'elle porte aujourd'hui. */
  dealCount: number;
  /** Les autres colonnes actives, candidates à l'accueil des opportunités. */
  destinations: BoardStage[];
  onConfirm: (destinationStageId?: string) => Promise<RemoveStageResult>;
}

/**
 * Retrait d'une colonne du pipeline (D24).
 *
 * Deux choses doivent être dites avant d'agir, parce qu'aucune n'est
 * réversible d'un clic :
 *
 * 1. **Où vont les opportunités.** Le backend exige la destination dès que la
 *    colonne en porte une, et écrit une ligne d'historique par déplacement.
 * 2. **Ce qu'il advient de la colonne.** Une étape déjà traversée est
 *    archivée, jamais supprimée : `DealStageHistory` la référence, et cet
 *    historique porte le calcul des délais moyens du CDC §4.6.
 */
export function RemoveStageModal({
  open,
  onClose,
  stage,
  dealCount,
  destinations,
  onConfirm,
}: RemoveStageModalProps) {
  const [destinationId, setDestinationId] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Réinitialise à chaque ouverture, sans effet : la modale sert tour à tour
  // chacune des colonnes.
  const [shownFor, setShownFor] = useState<string | null>(null);
  const key = open ? (stage?.id ?? null) : null;

  if (key !== shownFor) {
    setShownFor(key);
    if (open) {
      setServerError(null);
      setPending(false);
      setDestinationId(destinations[0]?.id ?? "");
    }
  }

  if (!stage) return null;

  const needsDestination = dealCount > 0;
  const blocked = needsDestination && !destinationId;

  async function confirm() {
    setServerError(null);
    setPending(true);

    try {
      await onConfirm(needsDestination ? destinationId : undefined);
      onClose();
    } catch (error) {
      setServerError(errorMessage(error, "Le retrait a été refusé."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Retirer « ${stage.name} » du pipeline`}
      description="La colonne disparaît du Kanban. Les opportunités qu'elle porte, jamais."
    >
      <div className="space-y-4">
        {needsDestination ? (
          <>
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-bg px-4 py-3"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-sm text-text">
                {dealCount} opportunité{dealCount > 1 ? "s" : ""} se trouve
                {dealCount > 1 ? "nt" : ""} à cette étape. Indiquez où
                {dealCount > 1 ? " les" : " la"} déplacer : chaque déplacement
                laissera une ligne d'historique.
              </p>
            </div>

            <div>
              <Label htmlFor="stage-destination">Étape de destination</Label>
              <Select
                id="stage-destination"
                value={destinationId}
                onChange={(event) => setDestinationId(event.target.value)}
              >
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name}
                    {destination.name !==
                      CANONICAL_STAGE_LABELS[destination.canonicalStage] &&
                      ` — ${CANONICAL_STAGE_LABELS[destination.canonicalStage]}`}
                  </option>
                ))}
              </Select>
              {destinations.length === 0 && (
                <p className="mt-1 text-xs text-danger">
                  Aucune autre étape active : le pipeline ne peut pas être vidé
                  de sa dernière colonne.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">
            Aucune opportunité n'est à cette étape : rien n'est à déplacer.
          </p>
        )}

        <p className="text-xs text-muted">
          Si cette étape a déjà été traversée par une opportunité, elle est
          <strong className="font-medium text-text"> archivée</strong> et non
          supprimée — son historique porte le calcul des délais moyens du
          reporting. Une étape qui n'a jamais rien porté disparaît réellement.
        </p>

        {serverError && (
          <p role="alert" className="text-sm text-danger">
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => void confirm()}
            disabled={pending || blocked}
            title={
              blocked ? "Choisissez d'abord une étape de destination." : undefined
            }
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Retirer l'étape
          </Button>
        </div>
      </div>
    </Modal>
  );
}
