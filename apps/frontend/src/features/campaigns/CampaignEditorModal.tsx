import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookUser, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { EntitySelect } from "@/components/shared/EntitySelect";

import { campaignsService, productsService } from "@/services/resources";
import { QK } from "@/config/constants";
import type { ApiError } from "@/types/api";
import { AiGeneratePanel } from "@/features/ai/AiGeneratePanel";
import { RecipientPickerModal } from "./RecipientPickerModal";

type Row = Record<string, unknown> & { id?: unknown };

interface Props {
  open: boolean;
  onClose: () => void;
  /** Absent = création. Une campagne déjà envoyée n'est plus modifiable. */
  campaign?: Row | null;
}

const TYPES = {
  SMS: "SMS",
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  VOICE: "Voice",
} as const;

type CampaignType = keyof typeof TYPES;

export function CampaignEditorModal({ open, onClose, campaign }: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(campaign);

  const [name, setName] = useState("");
  const [type, setType] = useState<CampaignType>("SMS");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [country, setCountry] = useState("");
  const [productId, setProductId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [destinations, setDestinations] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    setName(String(campaign?.name ?? ""));
    setType((campaign?.type as CampaignType) ?? "SMS");
    setSubject(String(campaign?.subject ?? ""));
    setMessage(String(campaign?.message ?? ""));
    setCountry(String(campaign?.country ?? ""));
    setProductId(String(campaign?.productId ?? ""));
    setScheduledAt(String(campaign?.scheduledAt ?? "").slice(0, 16));
    // Les destinataires déjà enregistrés ne se réécrivent pas ici : ils se
    // gèrent depuis la fiche de la campagne.
    setDestinations("");
  }, [open, campaign]);

  const create = useMutation({
    mutationFn: () => {
      // Une ligne par destinataire : c'est la forme qu'on copie depuis un
      // tableur, donc autant l'accepter telle quelle.
      const list = destinations
        .split(/[\n,;]/)
        .map((entry) => entry.trim())
        .filter(Boolean);

      const body = {
        name: name.trim(),
        type,
        message: message.trim(),
        ...(subject.trim() ? { subject: subject.trim() } : {}),
        ...(country.trim() ? { country: country.trim() } : {}),
        ...(productId ? { productId } : {}),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
        ...(list.length ? { destinations: list } : {}),
      };

      return isEdit
        ? campaignsService.update(String(campaign!.id), body as never)
        : campaignsService.create(body as never);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Campagne mise à jour" : "Campagne créée en brouillon");
      queryClient.invalidateQueries({ queryKey: QK.campaigns });
      onClose();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const recipientCount = destinations
    .split(/[\n,;]/)
    .map((entry) => entry.trim())
    .filter(Boolean).length;

  // Un SMS au-delà de 160 caractères est facturé en plusieurs segments :
  // l'information doit apparaître à la saisie, pas sur la facture.
  const segments = type === "SMS" ? Math.ceil(message.length / 160) || 1 : 0;

  const canSubmit = name.trim().length > 1 && message.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvelle campagne"
      description="La campagne est créée en brouillon ; l'envoi se déclenche depuis la liste."
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de la campagne" htmlFor="c-name" required>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Relance clients inactifs — août 2026"
              autoFocus
            />
          </Field>

          <Field label="Canal" htmlFor="c-type" required>
            <Select
              id="c-type"
              value={type}
              onChange={(e) => setType(e.target.value as CampaignType)}
            >
              {Object.entries(TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          {type === "EMAIL" && (
            <div className="sm:col-span-2">
              <Field label="Objet du message" htmlFor="c-subject">
                <Input
                  id="c-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Une offre pensée pour vous"
                />
              </Field>
            </div>
          )}
        </div>

        <Field
          label="Message"
          htmlFor="c-message"
          required
          hint="Les variables du type {{prenom}} sont remplacées à l'envoi."
        >
          <Textarea
            id="c-message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Bonjour {{prenom}}, ..."
          />
        </Field>

        {type === "SMS" && message.length > 0 && (
          <p className="-mt-2 text-xs text-slate">
            {message.length} caractères ·{" "}
            <span className={segments > 1 ? "text-amber" : ""}>
              {segments} segment{segments > 1 ? "s" : ""} facturé{segments > 1 ? "s" : ""} par
              destinataire
            </span>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pays ciblé" htmlFor="c-country" hint="Facultatif — sert au reporting.">
            <Input
              id="c-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Côte d'Ivoire"
            />
          </Field>

          <Field label="Produit rattaché" htmlFor="c-product">
            <EntitySelect
              id="c-product"
              service={productsService}
              queryKey={QK.products}
              value={productId}
              onChange={(id) => setProductId(id)}
              placeholder="Rechercher un produit"
              render={(row) => ({
                label: String(row.name ?? ""),
                detail: String(row.code ?? ""),
              })}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Programmer l'envoi"
              htmlFor="c-scheduled"
              hint="Laisser vide pour un envoi manuel depuis la liste."
            >
              <Input
                id="c-scheduled"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <Field
          label="Destinataires"
          htmlFor="c-destinations"
          hint="Un numéro ou une adresse par ligne. D'autres destinataires peuvent être ajoutés ensuite."
        >
          <div className="mb-2 flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
              <BookUser className="h-3.5 w-3.5" />
              Charger depuis l'annuaire
            </Button>
          </div>

          <Textarea
            id="c-destinations"
            rows={4}
            value={destinations}
            onChange={(e) => setDestinations(e.target.value)}
            placeholder={type === "EMAIL" ? "contact@entreprise.ci" : "+225 07 00 00 00 00"}
          />
        </Field>

        {recipientCount > 0 && (
          <p className="-mt-2 flex items-center gap-1.5 text-xs text-slate">
            <Users className="h-3.5 w-3.5" />
            {recipientCount} destinataire{recipientCount > 1 ? "s" : ""}
            {type === "SMS" && segments > 0 && ` · ${recipientCount * segments} SMS au total`}
          </p>
        )}

        {/* Rédaction assistée — sur une campagne enregistrée seulement : le
            serveur relit le canal, le pays et le produit ciblés en base pour
            composer le contexte, il lui faut donc un identifiant. */}
        {isEdit && campaign?.id && (
          <div className="space-y-3 border-t border-line pt-5">
            <AiGeneratePanel
              taskType="CAMPAIGN_MESSAGE"
              entityType="CAMPAIGN"
              entityId={String(campaign.id)}
              onAccept={(text) => setMessage(text.trim())}
            />
            <AiGeneratePanel
              taskType="CAMPAIGN_VARIANTS"
              entityType="CAMPAIGN"
              entityId={String(campaign.id)}
              onAccept={(text) => setMessage(text.trim())}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Annuler
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !canSubmit}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer le brouillon"}
          </Button>
        </div>
      </div>

      <RecipientPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        channel={type}
        onConfirm={(values) => {
          // Fusion avec la saisie manuelle : on ajoute sans écraser, et sans
          // réintroduire un destinataire déjà présent.
          setDestinations((prev) => {
            const existing = prev
              .split(/[\n,;]/)
              .map((entry) => entry.trim())
              .filter(Boolean);

            const merged = [...existing];
            for (const value of values) {
              if (!merged.includes(value)) merged.push(value);
            }

            return merged.join("\n");
          });
        }}
      />
    </Modal>
  );
}
