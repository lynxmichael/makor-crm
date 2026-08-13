import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select, Textarea } from "@/components/ui/Field";
import type { ApiError } from "@/types/api";
import { useAuthStore } from "@/store/auth.store";
import { EntitySelect } from "@/components/shared/EntitySelect";
import {
  contractsService,
  customersService,
  dealsService,
  invoicesService,
  leadsService,
  productsService,
  usersService,
} from "@/services/resources";
import { useQuery } from "@tanstack/react-query";
import { http } from "@/services/api";
import { QK } from "@/config/constants";
import { CommentThread } from "@/features/collaboration/CommentThread";
import { SignaturePanel } from "@/features/signatures/SignaturePanel";
import { AiGeneratePanel } from "@/features/ai/AiGeneratePanel";
import type { CommentEntityType } from "@/types/collab";
import type { AiTaskType } from "@/types/collab";
import type { ModuleConfig, ModuleField, Row } from "./module-config";

interface Props {
  open: boolean;
  onClose: () => void;
  config: ModuleConfig;
  row: Row | null;
  onSubmit: (values: Row) => Promise<unknown>;
  pending: boolean;
  error?: ApiError | null;
}

/**
 * Ressources sélectionnables et rendu d'une option.
 *
 * Chaque entrée dit quoi chercher et comment l'afficher — le libellé doit
 * suffire à reconnaître la fiche sans ouvrir autre chose.
 */
const REFERENCES = {
  customers: {
    service: customersService,
    queryKey: QK.customers,
    placeholder: "Rechercher un client",
    render: (row: Row) => ({
      label: String(row.companyName ?? ""),
      detail: String(row.code ?? ""),
    }),
  },
  invoices: {
    service: invoicesService,
    queryKey: QK.invoices,
    placeholder: "Rechercher une facture",
    render: (row: Row) => ({
      label: String(row.number ?? ""),
      detail: String((row.customer as Row | undefined)?.companyName ?? ""),
    }),
  },
  contracts: {
    service: contractsService,
    queryKey: QK.contracts,
    placeholder: "Rechercher un contrat",
    render: (row: Row) => ({
      label: `${String(row.number ?? "")} — ${String(row.title ?? "")}`,
    }),
  },
  products: {
    service: productsService,
    queryKey: QK.products,
    placeholder: "Rechercher un produit",
    render: (row: Row) => ({ label: String(row.name ?? ""), detail: String(row.code ?? "") }),
  },
  users: {
    service: usersService,
    queryKey: QK.users,
    placeholder: "Rechercher un agent",
    render: (row: Row) => ({
      label: `${String(row.firstName ?? "")} ${String(row.lastName ?? "")}`,
      detail: String(row.email ?? ""),
    }),
  },
  deals: {
    service: dealsService,
    queryKey: QK.deals,
    placeholder: "Rechercher une opportunité",
    render: (row: Row) => ({ label: String(row.title ?? "") }),
  },
  leads: {
    service: leadsService,
    queryKey: QK.leads,
    placeholder: "Rechercher un prospect",
    render: (row: Row) => ({
      label: `${String(row.firstName ?? "")} ${String(row.lastName ?? "")}`,
      detail: String(row.company ?? ""),
    }),
  },
} as const;

/** Une date ISO arrive en `2026-07-31T00:00:00.000Z` ; l'input attend `2026-07-31`. */
const toDateInput = (value: unknown) =>
  typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : "";

export function ModuleFormModal({
  open,
  onClose,
  config,
  row,
  onSubmit,
  pending,
  error,
}: Props) {
  const isEdit = Boolean(row);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [values, setValues] = useState<Row>({});

  useEffect(() => {
    if (!open) return;

    const initial: Row = {};
    for (const field of config.fields) {
      const current = row?.[field.key];
      initial[field.key] =
        field.type === "date" ? toDateInput(current) : (current ?? "");
    }
    setValues(initial);
  }, [open, row, config.fields]);

  function set(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Le backend tourne en `forbidNonWhitelisted` et rejette les chaînes vides
    // sur les champs typés : on n'envoie que ce qui est renseigné, et on
    // convertit les nombres avant l'envoi plutôt que de laisser partir du texte.
    // Champs pilotés par le serveur : les renvoyer fait échouer la requête en
    // 400, le ValidationPipe tournant en liste blanche stricte. Ce filet évite
    // qu'une configuration mal formée ne casse un formulaire entier.
    const SERVER_MANAGED = new Set(["id", "createdAt", "updatedAt", "number", "code"]);

    const payload: Row = {};
    for (const field of config.fields) {
      if (SERVER_MANAGED.has(field.key)) continue;
      const value = values[field.key];
      if (value === "" || value === undefined || value === null) continue;

      payload[field.key] =
        field.type === "number" || field.type === "money" ? Number(value) : value;
    }

    // Certains DTO exigent un champ que l'utilisateur n'a pas à saisir —
    // `assignedToId` sur une activité, par exemple. On l'ajoute à la
    // création seulement : en modification, le renvoyer réattribuerait la
    // fiche à qui l'édite.
    if (!isEdit && config.injectOnCreate) {
      for (const [key, source] of Object.entries(config.injectOnCreate)) {
        if (source === "currentUserId" && currentUserId) payload[key] = currentUserId;
      }
    }

    await onSubmit(payload);
  }

  /** Un champ peut n'être obligatoire que sous condition d'un autre champ. */
  const isRequired = (field: ModuleField) =>
    field.required ||
    (field.requiredWhen
      ? field.requiredWhen.equals.includes(String(values[field.requiredWhen.field] ?? ""))
      : false);

  const missingRequired = config.fields.some((field) => {
    if (!isRequired(field)) return false;
    const value = String(values[field.key] ?? "").trim();
    return value.length < Math.max(1, field.minLength ?? 1);
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Modifier — ${config.title}` : config.createLabel}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {config.fields.map((field) => (
            <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
              <Field
                label={field.label}
                htmlFor={field.key}
                required={isRequired(field)}
                hint={
                  field.minLength && isRequired(field)
                    ? `${field.hint ?? ""} ${
                        String(values[field.key] ?? "").trim().length
                      }/${field.minLength} caractères`.trim()
                    : field.hint
                }
                error={error?.fieldErrors?.[field.key]}
              >
                {renderInput(field, values[field.key], (v) => set(field.key, v))}
              </Field>
            </div>
          ))}
        </div>

        {/* Panneaux transverses — uniquement en modification : signature,
            commentaires et rédaction assistée portent sur une fiche déjà
            enregistrée, dont le serveur peut reconstruire le contexte. */}
        {isEdit && config.panels && row?.id && (
          <div className="space-y-4 border-t border-line pt-5">
            {config.panels.aiTask && config.panels.aiTarget && (
              <AiGeneratePanel
                taskType={config.panels.aiTask as AiTaskType}
                entityType={config.panels.entityType as CommentEntityType}
                entityId={String(row.id)}
                onAccept={(text) =>
                  set(
                    config.panels!.aiTarget!,
                    [String(values[config.panels!.aiTarget!] ?? ""), text]
                      .filter(Boolean)
                      .join("\n\n"),
                  )
                }
              />
            )}

            {config.panels.signature && (
              <SignaturePanel
                entityType={
                  config.panels.entityType as "QUOTE" | "PURCHASE_ORDER" | "CONTRACT"
                }
                entityId={String(row.id)}
              />
            )}

            {config.panels.comments && (
              <CommentThread
                entityType={config.panels.entityType as CommentEntityType}
                entityId={String(row.id)}
                title="Commentaires"
                emptyDetail="Notez ici le contexte, une consigne ou un point d'attention — vos collègues le verront."
              />
            )}
          </div>
        )}

        {error && !error.fieldErrors && (
          <p role="alert" className="rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert">
            {error.message}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button type="submit" disabled={pending || missingRequired}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Liste déroulante alimentée par un référentiel des Paramètres.
 *
 * La valeur libre déjà enregistrée est conservée en tête si elle ne figure
 * plus au référentiel : une saisie antérieure ne doit pas disparaître d'une
 * fiche parce qu'un pays a été retiré de la liste depuis.
 */
function LookupSelect({
  field,
  value,
  onChange,
}: {
  field: ModuleField;
  value: string;
  onChange: (value: string) => void;
}) {
  const source = field.lookup!.source;

  const query = useQuery({
    queryKey: ["settings", source],
    queryFn: () => http.get<{ id: string; name: string }[]>(`/settings/${source}`),
    staleTime: 5 * 60 * 1000,
  });

  const options = query.data ?? [];
  const orphan = value && !options.some((o) => o.name === value);

  return (
    <Select
      id={field.key}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={query.isPending}
    >
      <option value="">
        {query.isPending ? "Chargement…" : field.placeholder ?? "Sélectionner"}
      </option>

      {orphan && <option value={value}>{value} (hors référentiel)</option>}

      {options.map((option) => (
        <option key={option.id} value={option.name}>
          {option.name}
        </option>
      ))}
    </Select>
  );
}

function renderInput(field: ModuleField, value: unknown, onChange: (value: unknown) => void) {
  if (field.type === "lookup" && field.lookup) {
    return (
      <LookupSelect
        field={field}
        value={String(value ?? "")}
        onChange={(next) => onChange(next)}
      />
    );
  }

  if (field.type === "reference" && field.reference) {
    const ref = REFERENCES[field.reference.resource];

    return (
      <EntitySelect
        id={field.key}
        service={ref.service as never}
        queryKey={ref.queryKey}
        value={String(value ?? "")}
        onChange={(id) => onChange(id)}
        placeholder={field.placeholder ?? ref.placeholder}
        render={ref.render}
      />
    );
  }

  const common = {
    id: field.key,
    value: String(value ?? ""),
    placeholder: field.placeholder,
  };

  if (field.type === "textarea") {
    return <Textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />;
  }

  if (field.type === "select" || field.type === "status") {
    return (
      <Select {...common} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {Object.entries(field.options ?? {}).map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </Select>
    );
  }

  const htmlType =
    field.type === "money" || field.type === "number"
      ? "number"
      : field.type === "date"
        ? "date"
        : field.type === "email"
          ? "email"
          : field.type === "tel"
            ? "tel"
            : "text";

  return <Input {...common} type={htmlType} onChange={(e) => onChange(e.target.value)} />;
}
