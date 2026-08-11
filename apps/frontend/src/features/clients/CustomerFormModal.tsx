import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Label, Select, Textarea } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { countries, sectors } from "@/data/mock";
import { errorMessage } from "@/services/api";
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  type Customer,
  type CustomerPayload,
} from "@/services/customers";

/**
 * `EntityFormModal` n'est pas réutilisée ici : elle tient son état dans un
 * `useState`, ne valide rien et n'a aucun moyen d'afficher le refus du
 * serveur. Les conventions du frontend imposent `react-hook-form` + `zod`, et
 * un formulaire qui écrit vraiment en base doit pouvoir dire pourquoi il a
 * échoué.
 */
const schema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "La raison sociale comporte au moins 2 caractères."),

  sector: z.string(),
  country: z.string(),
  city: z.string(),
  address: z.string(),

  // Le backend valide par `@IsEmail()` : une chaîne vide serait rejetée, elle
  // est donc omise à l'envoi plutôt que transmise.
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.email().safeParse(value).success,
      "Adresse e-mail invalide.",
    ),

  phone: z.string(),
  website: z.string(),
  status: z.enum(CUSTOMER_STATUSES),
  notes: z.string(),
});

type CustomerForm = z.infer<typeof schema>;

function defaultsFor(customer: Customer | null): CustomerForm {
  return {
    companyName: customer?.companyName ?? "",
    sector: customer?.sector ?? "",
    country: customer?.country ?? "",
    city: customer?.city ?? "",
    address: customer?.address ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    website: customer?.website ?? "",
    status: customer?.status ?? "ACTIVE",
    notes: customer?.notes ?? "",
  };
}

/** Les champs vides sont omis, jamais envoyés comme chaîne vide. */
function toPayload(values: CustomerForm): CustomerPayload {
  const optional = (value: string) => (value.trim() ? value.trim() : undefined);

  return {
    companyName: values.companyName.trim(),
    sector: optional(values.sector),
    country: optional(values.country),
    city: optional(values.city),
    address: optional(values.address),
    email: optional(values.email),
    phone: optional(values.phone),
    website: optional(values.website),
    status: values.status,
    notes: optional(values.notes),
  };
}

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  /** `null` : création. Renseigné : modification de ce client. */
  customer: Customer | null;
  onSubmit: (payload: CustomerPayload) => Promise<unknown>;
}

export function CustomerFormModal({
  open,
  onClose,
  customer,
  onSubmit,
}: CustomerFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CustomerForm>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor(customer),
  });

  // Réinitialise à chaque ouverture, sans passer par un effet.
  const [shownFor, setShownFor] = useState<string | null>(null);
  const key = open ? (customer?.id ?? "creation") : null;

  if (key !== shownFor) {
    setShownFor(key);
    if (open) {
      setServerError(null);
      form.reset(defaultsFor(customer));
    }
  }

  async function submit(values: CustomerForm) {
    setServerError(null);

    try {
      await onSubmit(toPayload(values));
      onClose();
    } catch (error) {
      setServerError(
        errorMessage(
          error,
          customer ? "L'enregistrement a échoué." : "La création a échoué.",
        ),
      );
    }
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? `Modifier — ${customer.companyName}` : "Nouveau client"}
      description={
        customer
          ? `Référence ${customer.code}`
          : "La référence client est attribuée automatiquement."
      }
    >
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="customer-name">Raison sociale</Label>
          <Input
            id="customer-name"
            placeholder="Ex. Ecobank Côte d'Ivoire"
            aria-invalid={Boolean(errors.companyName)}
            {...form.register("companyName")}
          />
          {errors.companyName && (
            <p className="mt-1 text-xs text-danger">{errors.companyName.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="customer-sector">Secteur d'activité</Label>
            <Select id="customer-sector" {...form.register("sector")}>
              <option value="">—</option>
              {sectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="customer-country">Pays</Label>
            <Select id="customer-country" {...form.register("country")}>
              <option value="">—</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="customer-city">Ville</Label>
            <Input id="customer-city" placeholder="Ex. Abidjan" {...form.register("city")} />
          </div>

          <div>
            <Label htmlFor="customer-status">Statut</Label>
            <Select id="customer-status" {...form.register("status")}>
              {CUSTOMER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CUSTOMER_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="customer-address">Adresse</Label>
          <Input
            id="customer-address"
            placeholder="Ex. Plateau, avenue Terrasson de Fougères"
            {...form.register("address")}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="customer-email">E-mail</Label>
            <Input
              id="customer-email"
              type="email"
              placeholder="contact@entreprise.ci"
              aria-invalid={Boolean(errors.email)}
              {...form.register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="customer-phone">Téléphone</Label>
            <Input
              id="customer-phone"
              placeholder="+225 07 01 22 33 44"
              {...form.register("phone")}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="customer-website">Site web</Label>
          <Input
            id="customer-website"
            placeholder="https://entreprise.ci"
            {...form.register("website")}
          />
        </div>

        <div>
          <Label htmlFor="customer-notes">Notes</Label>
          <Textarea id="customer-notes" rows={3} {...form.register("notes")} />
        </div>

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
            {customer ? "Enregistrer" : "Créer le client"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
