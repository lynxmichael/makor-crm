import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/Field";
import { EntitySelect } from "@/components/shared/EntitySelect";

import { http } from "@/services/api";
import { customersService } from "@/services/resources";
import { QK } from "@/config/constants";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types/api";

type Kind = "LEAD" | "CONTACT";

/**
 * Création d'une entrée d'annuaire.
 *
 * Le choix contact / prospect n'est pas cosmétique : un contact dépend d'une
 * fiche client, un prospect existe seul. C'est ce qui décide des champs
 * proposés et du client exigé.
 */
export function DirectoryEntryModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [kind, setKind] = useState<Kind>("LEAD");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    if (!open) return;
    setKind("LEAD");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setJobTitle("");
    setCompany("");
    setCustomerId("");
    setCountry("");
    setCity("");
  }, [open]);

  const create = useMutation({
    mutationFn: () =>
      http.post("/directory", {
        kind,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(jobTitle.trim() ? { jobTitle: jobTitle.trim() } : {}),
        ...(kind === "CONTACT"
          ? { customerId }
          : {
              ...(company.trim() ? { company: company.trim() } : {}),
              ...(country.trim() ? { country: country.trim() } : {}),
              ...(city.trim() ? { city: city.trim() } : {}),
            }),
      }),
    onSuccess: () => {
      toast.success(kind === "CONTACT" ? "Contact ajouté" : "Prospect ajouté");
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      queryClient.invalidateQueries({ queryKey: QK.leads });
      queryClient.invalidateQueries({ queryKey: QK.contacts });
      onClose();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const canSubmit =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    (kind === "LEAD" || Boolean(customerId));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajouter à l'annuaire"
      description="Un prospect existe seul ; un contact dépend d'une fiche client."
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <div className="flex gap-1 rounded-xl border border-line bg-paper p-1">
          {(
            [
              ["LEAD", "Prospect", UserPlus],
              ["CONTACT", "Contact client", Building2],
            ] as const
          ).map(([value, label, Glyph]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                kind === value ? "bg-surface text-ink shadow-e1" : "text-slate hover:text-ink",
              )}
            >
              <Glyph className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" htmlFor="d-first" required>
            <Input
              id="d-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoFocus
            />
          </Field>

          <Field label="Nom" htmlFor="d-last" required>
            <Input id="d-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>

          <Field
            label="E-mail"
            htmlFor="d-email"
            hint="Sert à écarter les doublons et à cibler les campagnes."
          >
            <Input
              id="d-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Téléphone" htmlFor="d-phone" hint="Indispensable pour un envoi SMS.">
            <Input
              id="d-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+225 07 00 00 00 00"
            />
          </Field>

          <Field label="Fonction" htmlFor="d-job">
            <Input
              id="d-job"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Directeur marketing"
            />
          </Field>

          {kind === "CONTACT" ? (
            <Field label="Client" htmlFor="d-customer" required>
              <EntitySelect
                id="d-customer"
                service={customersService}
                queryKey={QK.customers}
                value={customerId}
                onChange={(id) => setCustomerId(id)}
                placeholder="Rechercher un client"
                render={(row) => ({
                  label: String(row.companyName ?? ""),
                  detail: String(row.code ?? ""),
                })}
              />
            </Field>
          ) : (
            <Field label="Entreprise" htmlFor="d-company">
              <Input
                id="d-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </Field>
          )}
        </div>

        {/* Un contact hérite du pays de son client : le redemander créerait
            deux sources de vérité pour la même information. */}
        {kind === "LEAD" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pays" htmlFor="d-country" hint="Permet de retrouver l'entrée par zone.">
              <Input
                id="d-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Côte d'Ivoire"
              />
            </Field>

            <Field label="Ville" htmlFor="d-city">
              <Input
                id="d-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Abidjan"
              />
            </Field>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Annuler
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !canSubmit}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Ajouter
          </Button>
        </div>
      </div>
    </Modal>
  );
}
