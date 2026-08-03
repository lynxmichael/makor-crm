import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select, Textarea } from "@/components/ui/Field";
import type { ApiError } from "@/types/api";
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
    const payload: Row = {};
    for (const field of config.fields) {
      const value = values[field.key];
      if (value === "" || value === undefined || value === null) continue;

      payload[field.key] =
        field.type === "number" || field.type === "money" ? Number(value) : value;
    }

    await onSubmit(payload);
  }

  const missingRequired = config.fields.some(
    (field) => field.required && !String(values[field.key] ?? "").trim(),
  );

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
                required={field.required}
                hint={field.hint}
                error={error?.fieldErrors?.[field.key]}
              >
                {renderInput(field, values[field.key], (v) => set(field.key, v))}
              </Field>
            </div>
          ))}
        </div>

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

function renderInput(field: ModuleField, value: unknown, onChange: (value: unknown) => void) {
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
