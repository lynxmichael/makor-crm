import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select } from "@/components/ui/Field";
import { EntitySelect } from "@/components/shared/EntitySelect";

import { api } from "@/services/api";
import { contractsService, customersService, quotesService } from "@/services/resources";
import { QK } from "@/config/constants";
import type { ApiError } from "@/types/api";

const DOCUMENT_TYPES: Record<string, string> = {
  CONTRACT: "Contrat",
  INVOICE: "Facture",
  QUOTE: "Facture proforma",
  IMAGE: "Image",
  PDF: "PDF",
  WORD: "Document Word",
  EXCEL: "Classeur Excel",
  OTHER: "Autre",
};

/**
 * Type déduit de l'extension.
 *
 * Le champ reste modifiable : un PDF peut être un contrat autant qu'une note
 * quelconque, et c'est l'usage qui compte pour le classement, pas le format.
 * Mais proposer une valeur juste dans la plupart des cas évite un choix de
 * plus à chaque dépôt.
 */
function guessType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";

  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "IMAGE";
  if (ext === "pdf") return "PDF";
  if (["doc", "docx"].includes(ext)) return "WORD";
  if (["xls", "xlsx", "csv"].includes(ext)) return "EXCEL";

  return "OTHER";
}

export function DocumentUploadModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("OTHER");
  const [customerId, setCustomerId] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [contractId, setContractId] = useState("");

  useEffect(() => {
    if (open) return;
    setFile(null);
    setName("");
    setType("OTHER");
    setCustomerId("");
    setQuoteId("");
    setContractId("");
    if (fileInput.current) fileInput.current.value = "";
  }, [open]);

  const upload = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("file", file!);
      form.append("name", name.trim() || file!.name);
      form.append("type", type);
      if (customerId) form.append("customerId", customerId);
      if (quoteId) form.append("quoteId", quoteId);
      if (contractId) form.append("contractId", contractId);

      // Content-Type laissé au navigateur : le fixer omettrait la « boundary »
      // qui sépare les parties du multipart, et le serveur ne verrait aucun
      // fichier.
      const response = await api.post("/documents/upload", form);

      return response.data;
    },
    onSuccess: () => {
      toast.success("Document déposé");
      queryClient.invalidateQueries({ queryKey: QK.documents });
      onClose();
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  function pick(selected: File | null) {
    setFile(selected);
    if (!selected) return;

    // Le nom du fichier fait un intitulé acceptable par défaut ; l'extension
    // n'apporte rien dans une liste où le type est déjà une colonne.
    if (!name.trim()) setName(selected.name.replace(/\.[^.]+$/, ""));
    setType(guessType(selected.name));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Déposer un document"
      description="20 Mo maximum. Le rattachement facilite la recherche mais reste facultatif."
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <input
          ref={fileInput}
          type="file"
          hidden
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />

        {file ? (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-paper p-3">
            <FileText className="h-5 w-5 shrink-0 text-wire" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{file.name}</span>
              <span className="text-xs text-slate">
                {(file.size / 1024 / 1024).toFixed(2)} Mo
              </span>
            </span>
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
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-paper/50 px-4 py-10 text-center transition-colors hover:border-wire hover:bg-wire/5"
          >
            <Upload className="h-6 w-6 text-slate" />
            <span className="text-sm font-medium text-ink">Choisir un fichier</span>
            <span className="text-xs text-slate">PDF, image, Word, Excel — 20 Mo maximum</span>
          </button>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Intitulé" htmlFor="d-name" required>
            <Input
              id="d-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contrat signé — Orange CI"
            />
          </Field>

          <Field label="Type" htmlFor="d-type" required>
            <Select id="d-type" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Client"
          htmlFor="d-customer"
          hint="Le document apparaîtra dans son historique."
        >
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Facture proforma" htmlFor="d-quote">
            <EntitySelect
              id="d-quote"
              service={quotesService}
              queryKey={QK.quotes}
              value={quoteId}
              onChange={(id) => setQuoteId(id)}
              placeholder="Rechercher une proforma"
              render={(row) => ({
                label: `${String(row.number ?? "")} — ${String(row.title ?? "")}`,
              })}
            />
          </Field>

          <Field label="Contrat" htmlFor="d-contract">
            <EntitySelect
              id="d-contract"
              service={contractsService}
              queryKey={QK.contracts}
              value={contractId}
              onChange={(id) => setContractId(id)}
              placeholder="Rechercher un contrat"
              render={(row) => ({
                label: `${String(row.number ?? "")} — ${String(row.title ?? "")}`,
              })}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={upload.isPending}>
            Annuler
          </Button>
          <Button
            onClick={() => upload.mutate()}
            disabled={upload.isPending || !file || !name.trim()}
          >
            {upload.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Déposer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
