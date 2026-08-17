import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/Field";
import { EntitySelect } from "@/components/shared/EntitySelect";

import { api } from "@/services/api";
import { customersService } from "@/services/resources";
import { QK } from "@/config/constants";
import type { ApiError } from "@/types/api";

interface Report {
  total: number;
  created: number;
  skipped: number;
  errors: { line: number; reason: string }[];
}

export function DirectoryImportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [report, setReport] = useState<Report | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("file", file!);
      if (customerId) form.append("customerId", customerId);

      // Content-Type laissé au navigateur : le fixer omettrait la « boundary ».
      const response = await api.post<Report>("/directory/import", form);
      return response.data;
    },
    onSuccess: (result) => {
      setReport(result);
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      queryClient.invalidateQueries({ queryKey: QK.leads });
      queryClient.invalidateQueries({ queryKey: QK.contacts });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  function reset() {
    setFile(null);
    setCustomerId("");
    setReport(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Importer des contacts"
      description="Fichier Excel ou CSV. Les colonnes sont reconnues automatiquement."
      className="max-w-2xl"
    >
      {report ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-paper p-3">
              <p className="text-xs text-slate">Lignes lues</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink">{report.total}</p>
            </div>
            <div className="rounded-xl border border-signal/25 bg-signal/5 p-3">
              <p className="text-xs text-signal">Créées</p>
              <p className="mt-1 font-display text-xl font-semibold text-signal">
                {report.created}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-paper p-3">
              <p className="text-xs text-slate">Doublons écartés</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink">{report.skipped}</p>
            </div>
          </div>

          {report.skipped > 0 && (
            <p className="text-xs leading-relaxed text-slate">
              Les doublons sont reconnus à l'e-mail ou au téléphone. Réimporter le même fichier
              ne créera donc jamais de doublons.
            </p>
          )}

          {report.errors.length > 0 && (
            <div className="rounded-xl border border-amber/30 bg-amber/5 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-amber">
                <AlertTriangle className="h-4 w-4" />
                {report.errors.length} ligne{report.errors.length > 1 ? "s" : ""} en erreur
              </p>
              <ul className="scrollbar-thin max-h-40 space-y-1 overflow-y-auto text-xs text-slate">
                {report.errors.map((error) => (
                  <li key={error.line}>
                    Ligne {error.line} — {error.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="secondary" onClick={reset}>
              Importer un autre fichier
            </Button>
            <Button
              onClick={() => {
                reset();
                onClose();
              }}
            >
              <Check className="h-4 w-4" />
              Terminé
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <Field
            label="Rattacher à un client"
            htmlFor="imp-customer"
            hint="Laissez vide pour créer des prospects. Renseigné, les lignes deviennent les contacts de ce client."
          >
            <EntitySelect
              id="imp-customer"
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

          <div>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.csv"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            {file ? (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-paper p-3">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-wire" />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{file.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                  aria-label="Retirer le fichier"
                  className="text-slate hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-paper/50 px-4 py-8 text-center transition-colors hover:border-wire hover:bg-wire/5"
              >
                <Upload className="h-6 w-6 text-slate" />
                <span className="text-sm font-medium text-ink">Choisir un fichier</span>
                <span className="text-xs text-slate">Excel (.xlsx) ou CSV — 10 Mo maximum</span>
              </button>
            )}
          </div>

          <div className="rounded-xl bg-paper p-3">
            <p className="mb-1.5 text-xs font-medium text-slate">Colonnes reconnues</p>
            <p className="text-xs leading-relaxed text-slate">
              Nom, Prénom, E-mail, Téléphone, Entreprise, Fonction, Pays, Ville, Secteur — en
              français ou en anglais, dans n'importe quel ordre. Seul un nom ou un prénom est
              obligatoire ; la première ligne doit contenir les en-têtes.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="secondary" onClick={onClose} disabled={upload.isPending}>
              Annuler
            </Button>
            <Button onClick={() => upload.mutate()} disabled={upload.isPending || !file}>
              {upload.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Importer
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
