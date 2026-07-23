import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label, Select } from "@/components/ui/Field";
import type { ModuleRow } from "@/types";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "select" | "date" | "number";
  options?: string[];
  placeholder?: string;
}

interface EntityFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ModuleRow) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  initialValues?: ModuleRow;
}

export function EntityFormModal({
  open,
  onClose,
  onSubmit,
  title,
  description,
  fields,
  initialValues,
}: EntityFormModalProps) {
  const [values, setValues] = useState<ModuleRow>({});

  // Réinitialise le formulaire à chaque transition fermé → ouvert, sans passer par un effet
  // (voir https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setValues(initialValues ?? {});
  }

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(values);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <Label htmlFor={field.key}>{field.label}</Label>
            {field.type === "select" ? (
              <Select
                id={field.key}
                value={String(values[field.key] ?? "")}
                onChange={(e) => update(field.key, e.target.value)}
                required
              >
                <option value="" disabled>
                  Choisir…
                </option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id={field.key}
                type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                placeholder={field.placeholder}
                value={String(values[field.key] ?? "")}
                onChange={(e) => update(field.key, e.target.value)}
                required
              />
            )}
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit">Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}
