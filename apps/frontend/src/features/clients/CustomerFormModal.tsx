import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { CUSTOMER_STATUS_LABELS } from "./customer-status";
import type { ApiError, Customer, CustomerInput, CustomerStatus } from "@/types/api";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Absent = création. */
  customer?: Customer | null;
  onSubmit: (values: CustomerInput) => Promise<unknown>;
  pending: boolean;
  error?: ApiError | null;
}

const EMPTY: CustomerInput = {
  companyName: "",
  sector: "",
  country: "",
  city: "",
  address: "",
  email: "",
  phone: "",
  website: "",
  status: "ACTIVE",
  notes: "",
};

/**
 * Création et modification partagent le même formulaire : les champs sont les
 * mêmes, seul le verbe change. Dupliquer les deux écrans reviendrait à
 * maintenir deux fois la même liste de champs.
 */
export function CustomerFormModal({ open, onClose, customer, onSubmit, pending, error }: Props) {
  const isEdit = Boolean(customer);
  const [values, setValues] = useState<CustomerInput>(EMPTY);

  // On resynchronise à l'ouverture uniquement : réagir à chaque changement de
  // `customer` écraserait la saisie en cours si la liste se rafraîchit en
  // arrière-plan.
  useEffect(() => {
    if (!open) return;
    setValues(
      customer
        ? {
            companyName: customer.companyName,
            sector: customer.sector ?? "",
            country: customer.country ?? "",
            city: customer.city ?? "",
            address: customer.address ?? "",
            email: customer.email ?? "",
            phone: customer.phone ?? "",
            website: customer.website ?? "",
            status: customer.status,
            notes: customer.notes ?? "",
          }
        : EMPTY,
    );
  }, [open, customer]);

  function set<K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Le backend refuse les chaînes vides sur les champs @IsEmail / @IsUrl :
    // on n'envoie que ce qui est réellement rempli.
    const payload = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== "" && v !== undefined),
    ) as unknown as CustomerInput;

    await onSubmit(payload);
  }

  const fieldError = (name: string) => error?.fieldErrors?.[name];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Modifier le client" : "Nouveau client"}
      description={
        isEdit
          ? `Référence ${customer?.code}`
          : "La référence client est attribuée automatiquement à l'enregistrement."
      }
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Raison sociale" htmlFor="companyName" required error={fieldError("companyName")}>
          <Input
            id="companyName"
            value={values.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            placeholder="Orange Côte d'Ivoire"
            required
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Secteur d'activité" htmlFor="sector" error={fieldError("sector")}>
            <Input
              id="sector"
              value={values.sector}
              onChange={(e) => set("sector", e.target.value)}
              placeholder="Télécommunications"
            />
          </Field>

          <Field label="Statut" htmlFor="status">
            <Select
              id="status"
              value={values.status}
              onChange={(e) => set("status", e.target.value as CustomerStatus)}
            >
              {Object.entries(CUSTOMER_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Pays" htmlFor="country" error={fieldError("country")}>
            <Input
              id="country"
              value={values.country}
              onChange={(e) => set("country", e.target.value)}
              placeholder="Côte d'Ivoire"
            />
          </Field>

          <Field label="Ville" htmlFor="city" error={fieldError("city")}>
            <Input
              id="city"
              value={values.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Abidjan"
            />
          </Field>

          <Field
            label="E-mail"
            htmlFor="email"
            error={fieldError("email")}
            hint="Adresse de facturation et d'envoi des documents."
          >
            <Input
              id="email"
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="contact@entreprise.ci"
            />
          </Field>

          <Field
            label="Téléphone"
            htmlFor="phone"
            error={fieldError("phone")}
            hint="Doit être unique parmi les clients."
          >
            <Input
              id="phone"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+225 07 00 00 00 00"
            />
          </Field>
        </div>

        <Field label="Adresse" htmlFor="address" error={fieldError("address")}>
          <Input
            id="address"
            value={values.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Rue du Commerce, Plateau"
          />
        </Field>

        <Field label="Site web" htmlFor="website" error={fieldError("website")}>
          <Input
            id="website"
            value={values.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://entreprise.ci"
          />
        </Field>

        <Field label="Notes" htmlFor="notes" error={fieldError("notes")}>
          <Textarea
            id="notes"
            rows={3}
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Contexte commercial, historique, points d'attention…"
          />
        </Field>

        {/* Erreur globale : celles rattachées à un champ sont déjà affichées
            au bon endroit, inutile de les répéter ici. */}
        {error && !error.fieldErrors && (
          <p role="alert" className="rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert">
            {error.message}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button type="submit" disabled={pending || !values.companyName.trim()}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer le client"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
