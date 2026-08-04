import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Textarea } from "@/components/ui/Field";
import { EntitySelect } from "@/components/shared/EntitySelect";

import { dealsService, customersService, leadsService } from "@/services/resources";
import { useAuthStore } from "@/store/auth.store";
import { QK } from "@/config/constants";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

/**
 * Création d'une opportunité.
 *
 * Elle manquait : le pipeline n'affichait que des cartes existantes, et la
 * grille de qualification s'ouvrant depuis une carte, un pipeline vide
 * rendait les questionnaires introuvables.
 *
 * `stageId` n'est pas demandé — le serveur place l'affaire sur la première
 * étape configurée. Choisir son étape de départ n'a pas de sens : une
 * opportunité entre toujours par le début du tunnel.
 */
export function DealFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [probability, setProbability] = useState("20");
  const [customerId, setCustomerId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setAmount("");
    setProbability("20");
    setCustomerId("");
    setLeadId("");
    setExpectedCloseDate("");
    setDescription("");
  }, [open]);

  const create = useMutation({
    mutationFn: () =>
      dealsService.create({
        title: title.trim(),
        amount: Number(amount) || 0,
        // Le DTO l'exige et la question n'a pas d'intérêt : on crée ses
        // propres affaires. Un superviseur pourra réaffecter ensuite.
        assignedToId: currentUserId,
        ...(Number(probability) ? { probability: Number(probability) } : {}),
        ...(customerId ? { customerId } : {}),
        ...(leadId ? { leadId } : {}),
        ...(expectedCloseDate
          ? { expectedCloseDate: new Date(expectedCloseDate).toISOString() }
          : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      } as never),
    onSuccess: () => {
      toast.success("Opportunité créée — ouvrez-la pour la qualifier");
      queryClient.invalidateQueries({ queryKey: QK.deals });
      onClose();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const canSubmit = title.trim().length > 1 && Number(amount) > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle opportunité"
      description="Elle entrera sur la première étape du pipeline."
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <Field label="Intitulé" htmlFor="d-title" required>
          <Input
            id="d-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Campagne SMS trimestrielle — Orange CI"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Montant estimé (FCFA)" htmlFor="d-amount" required>
            <Input
              id="d-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>

          <Field
            label="Probabilité (%)"
            htmlFor="d-proba"
            hint="Elle s'affinera au fil de la qualification."
          >
            <Input
              id="d-proba"
              type="number"
              min={0}
              max={100}
              value={probability}
              onChange={(e) => setProbability(e.target.value)}
            />
          </Field>

          <Field
            label="Client"
            htmlFor="d-customer"
            hint="Pour une affaire chez un client déjà en portefeuille."
          >
            <EntitySelect
              id="d-customer"
              service={customersService}
              queryKey={QK.customers}
              value={customerId}
              onChange={(id) => {
                setCustomerId(id);
                // Une affaire se rattache à un client OU à un prospect, pas
                // aux deux : renseigner l'un efface l'autre.
                if (id) setLeadId("");
              }}
              placeholder="Rechercher un client"
              render={(row) => ({
                label: String(row.companyName ?? ""),
                detail: String(row.code ?? ""),
              })}
            />
          </Field>

          <Field label="Prospect" htmlFor="d-lead" hint="Si l'affaire vient d'un prospect.">
            <EntitySelect
              id="d-lead"
              service={leadsService}
              queryKey={QK.leads}
              value={leadId}
              onChange={(id) => {
                setLeadId(id);
                if (id) setCustomerId("");
              }}
              placeholder="Rechercher un prospect"
              render={(row) => ({
                label: `${String(row.firstName ?? "")} ${String(row.lastName ?? "")}`,
                detail: String(row.company ?? ""),
              })}
            />
          </Field>

          <Field label="Clôture prévue" htmlFor="d-close">
            <Input
              id="d-close"
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Contexte" htmlFor="d-desc">
          <Textarea
            id="d-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Origine de l'affaire, interlocuteur, enjeu…"
          />
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Annuler
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !canSubmit}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer l'opportunité
          </Button>
        </div>
      </div>
    </Modal>
  );
}
