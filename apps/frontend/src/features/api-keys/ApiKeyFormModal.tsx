import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/Field";
import { EntitySelect } from "@/components/shared/EntitySelect";

import { customersService } from "@/services/resources";
import { http } from "@/services/api";
import { QK } from "@/config/constants";
import { SCOPE_LABELS } from "./ApiKeysPage";
import type { ApiError } from "@/types/api";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Remonte la clé complète — affichée une seule fois par la page. */
  onIssued: (key: string, name: string) => void;
}

export function ApiKeyFormModal({ open, onClose, onIssued }: Props) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [scopes, setScopes] = useState<string[]>(["MESSAGES_SEND"]);
  const [senderId, setSenderId] = useState("");
  const [rateLimit, setRateLimit] = useState("60");
  const [expiresAt, setExpiresAt] = useState("");
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setCustomerId("");
    setScopes(["MESSAGES_SEND"]);
    setSenderId("");
    setRateLimit("60");
    setExpiresAt("");
    setTestMode(false);
  }, [open]);

  const create = useMutation({
    mutationFn: () =>
      http.post<{ key: string; name: string }>("/api-keys", {
        name: name.trim(),
        customerId,
        scopes,
        ...(senderId.trim() ? { senderId: senderId.trim() } : {}),
        rateLimitPerMinute: Number(rateLimit) || 60,
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
        ...(testMode ? { testMode: true } : {}),
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      onClose();
      onIssued(result.key, result.name);
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  function toggleScope(scope: string) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  const canSubmit = name.trim().length > 1 && Boolean(customerId) && scopes.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Émettre une clé d'API"
      description="La clé donnera accès aux envois du client sélectionné."
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <Field label="Nom de l'intégration" htmlFor="k-name" required>
          <Input
            id="k-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Boutique en ligne — notifications de commande"
            autoFocus
          />
        </Field>

        <Field
          label="Client"
          htmlFor="k-customer"
          required
          hint="Les envois sont débités de son solde et apparaissent dans son reporting."
        >
          <EntitySelect
            id="k-customer"
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
          <p className="mb-2 text-sm font-medium text-ink">
            Autorisations <span className="text-pulse">*</span>
          </p>
          <p className="mb-2.5 text-xs text-slate">
            N'accordez que ce dont l'intégration a besoin. Une clé qui n'envoie que des OTP n'a
            pas à pouvoir lire le solde.
          </p>

          <div className="space-y-2">
            {Object.entries(SCOPE_LABELS).map(([scope, label]) => (
              <label
                key={scope}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-paper/60"
              >
                <input
                  type="checkbox"
                  checked={scopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                  className="h-4 w-4 rounded border-line accent-wire"
                />
                <span className="text-ink">{label}</span>
                <code className="ml-auto font-mono-tabular text-xs text-slate">{scope}</code>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Sender ID imposé" htmlFor="k-sender" hint="Facultatif.">
            <Input
              id="k-sender"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              placeholder="MAKOR"
            />
          </Field>

          <Field label="Appels / minute" htmlFor="k-rate">
            <Input
              id="k-rate"
              type="number"
              min={0}
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
            />
          </Field>

          <Field label="Expire le" htmlFor="k-expires" hint="Vide = sans échéance.">
            <Input
              id="k-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </Field>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={testMode}
            onChange={(e) => setTestMode(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-wire"
          />
          Clé de test
          <span className="text-xs text-slate">
            (préfixe mk_test_, pour distinguer une intégration en cours)
          </span>
        </label>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Annuler
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !canSubmit}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Émettre la clé
          </Button>
        </div>
      </div>
    </Modal>
  );
}
