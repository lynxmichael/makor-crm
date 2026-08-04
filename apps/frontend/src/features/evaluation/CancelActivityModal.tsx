import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/Field";

import { http } from "@/services/api";
import { QK } from "@/config/constants";
import { CANCELLATION_LABELS } from "./EvaluationPage";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

/**
 * Annulation d'un rendez-vous, motif obligatoire (demande du 31/07/2026).
 *
 * La contrainte est appliquée côté serveur ; l'interface la reprend pour
 * que le refus n'arrive pas après coup, mais ce n'est pas elle qui protège.
 */
export function CancelActivityModal({
  activity,
  onClose,
}: {
  activity: Row | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [reason, setReason] = useState("CLIENT_INDISPONIBLE");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!activity) return;
    setReason("CLIENT_INDISPONIBLE");
    setNote("");
  }, [activity]);

  const cancel = useMutation({
    mutationFn: () =>
      http.patch(`/evaluation/activities/${String(activity!.id)}/cancel`, {
        reason,
        note: note.trim(),
      }),
    onSuccess: () => {
      toast.success("Rendez-vous annulé");
      queryClient.invalidateQueries({ queryKey: QK.activities });
      queryClient.invalidateQueries({ queryKey: ["evaluation"] });
      onClose();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  return (
    <Modal
      open={Boolean(activity)}
      onClose={onClose}
      title="Annuler ce rendez-vous"
      description={String(activity?.title ?? "")}
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-slate">
          Le motif est obligatoire : il apparaîtra dans le suivi d'équipe. Une annulation sans
          explication ne dit rien d'exploitable en revue.
        </p>

        <Field label="Motif" htmlFor="c-reason" required>
          <Select id="c-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {Object.entries(CANCELLATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Explication"
          htmlFor="c-note"
          required
          hint="Une phrase au moins — ce qui s'est passé, et la suite prévue."
        >
          <Textarea
            id="c-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Le client a demandé un report au mois prochain, nouveau créneau à caler."
            autoFocus
          />
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={cancel.isPending}>
            Revenir
          </Button>
          <Button
            variant="danger"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending || note.trim().length < 10}
          >
            {cancel.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Annuler le rendez-vous
          </Button>
        </div>
      </div>
    </Modal>
  );
}
