import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, Ban, KeyRound, Plus, Copy, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/DataState";

import { ApiKeyFormModal } from "./ApiKeyFormModal";
import { ApiKeyStatsModal } from "./ApiKeyStatsModal";
import { http } from "@/services/api";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { formatDate } from "@/lib/format";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

export const SCOPE_LABELS: Record<string, string> = {
  MESSAGES_SEND: "Envoi de messages",
  MESSAGES_READ: "Lecture des statuts",
  BALANCE_READ: "Lecture du solde",
  CAMPAIGNS_READ: "Lecture des campagnes",
};

export function ApiKeysPage() {
  const reduced = usePrefersReducedMotion();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [statsFor, setStatsFor] = useState<Row | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<Row | null>(null);
  /** Clé fraîchement émise — affichée une seule fois. */
  const [issued, setIssued] = useState<{ key: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const query = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => http.get<Row[]>("/api-keys"),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => http.delete(`/api-keys/${id}`),
    onSuccess: () => {
      toast.success("Clé révoquée");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const keys = query.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            API partenaires
          </h1>
          <p className="mt-1 text-sm text-slate">
            Clés d'intégration permettant à vos partenaires d'envoyer des messages depuis leurs
            propres applications.
          </p>
        </div>

        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Émettre une clé
        </Button>
      </header>

      {query.isPending ? (
        <TableSkeleton rows={5} columns={6} />
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Aucune clé émise"
          detail="Émettez une clé pour permettre à un client d'intégrer l'envoi de messages dans son propre système."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Émettre une clé
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-slate">
                  <th className="px-4 py-3">Clé</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Autorisations</th>
                  <th className="px-4 py-3 text-right">Appels</th>
                  <th className="px-4 py-3">Dernier appel</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <motion.tbody
                variants={reduced ? undefined : staggerContainer}
                initial="initial"
                animate="animate"
              >
                {keys.map((key) => {
                  const customer = key.customer as Row | undefined;
                  const scopes = (key.scopes as string[]) ?? [];
                  const revoked = Boolean(key.revokedAt);
                  const expired =
                    key.expiresAt !== null &&
                    key.expiresAt !== undefined &&
                    new Date(String(key.expiresAt)) < new Date();

                  return (
                    <motion.tr
                      key={String(key.id)}
                      variants={reduced ? undefined : staggerItem}
                      className={`border-b border-line transition-colors last:border-0 hover:bg-paper/60 ${
                        revoked ? "opacity-60" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{String(key.name ?? "")}</p>
                        <p className="font-mono-tabular text-xs text-slate">
                          {String(key.prefix ?? "")}…
                        </p>
                      </td>

                      <td className="px-4 py-3 text-ink">
                        {String(customer?.companyName ?? "—")}
                      </td>

                      <td className="px-4 py-3">
                        <span className="flex flex-wrap gap-1">
                          {scopes.map((scope) => (
                            <Badge key={scope} tone="neutral">
                              {SCOPE_LABELS[scope] ?? scope}
                            </Badge>
                          ))}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-mono-tabular text-ink">
                        {String(key.usageCount ?? 0)}
                      </td>

                      <td className="px-4 py-3 text-slate">
                        {key.lastUsedAt ? formatDate(key.lastUsedAt as string) : "Jamais"}
                      </td>

                      <td className="px-4 py-3">
                        {revoked ? (
                          <Badge tone="alert">Révoquée</Badge>
                        ) : expired ? (
                          <Badge tone="amber">Expirée</Badge>
                        ) : key.isActive === false ? (
                          <Badge tone="neutral">Suspendue</Badge>
                        ) : (
                          <Badge tone="signal">Active</Badge>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStatsFor(key)}
                            aria-label="Voir l'activité"
                          >
                            <Activity className="h-4 w-4" />
                          </Button>

                          {!revoked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-alert hover:bg-alert/10"
                              onClick={() => setConfirmRevoke(key)}
                              aria-label="Révoquer"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        </div>
      )}

      <ApiKeyFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onIssued={(key, name) => {
          setIssued({ key, name });
          setCopied(false);
        }}
      />

      <ApiKeyStatsModal apiKey={statsFor} onClose={() => setStatsFor(null)} />

      {/* Affichage unique de la clé émise */}
      <Modal
        open={Boolean(issued)}
        onClose={() => setIssued(null)}
        title="Clé émise"
        description={issued?.name}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-amber/30 bg-amber/5 p-3">
            <p className="text-sm leading-relaxed text-ink">
              Copiez cette clé maintenant : elle ne sera <strong>plus jamais affichée</strong>.
              Seule son empreinte est conservée — en cas de perte, il faudra la révoquer et en
              émettre une nouvelle.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-ink p-3">
            <code className="font-mono-tabular flex-1 break-all text-sm text-white">
              {issued?.key}
            </code>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (!issued) return;
                void navigator.clipboard.writeText(issued.key);
                setCopied(true);
                toast.success("Clé copiée");
              }}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiée" : "Copier"}
            </Button>
          </div>

          <div className="rounded-lg bg-paper p-3">
            <p className="mb-1.5 text-xs font-medium text-slate">Exemple d'appel</p>
            <pre className="scrollbar-thin overflow-x-auto text-xs leading-relaxed text-ink">
{`curl -X POST https://api.makor.ci/api/v1/partner/messages \\
  -H "x-api-key: ${issued?.key ?? ""}" \\
  -H "Content-Type: application/json" \\
  -d '{"destinations":["+2250700000000"],"message":"Votre code est 1234"}'`}
            </pre>
          </div>

          <div className="flex justify-end border-t border-line pt-4">
            <Button onClick={() => setIssued(null)} disabled={!copied}>
              {copied ? "J'ai conservé la clé" : "Copiez la clé pour continuer"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(confirmRevoke)}
        onClose={() => setConfirmRevoke(null)}
        title="Révoquer cette clé ?"
        description={String(confirmRevoke?.name ?? "")}
      >
        <p className="text-sm leading-relaxed text-slate">
          L'intégration du partenaire cessera de fonctionner immédiatement. La clé reste visible
          ici avec son historique d'appels — révoquer coupe l'accès, cela n'efface pas la trace
          des envois passés.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmRevoke(null)}>
            Annuler
          </Button>
          <Button
            variant="danger"
            disabled={revoke.isPending}
            onClick={async () => {
              if (confirmRevoke) await revoke.mutateAsync(String(confirmRevoke.id));
              setConfirmRevoke(null);
            }}
          >
            Révoquer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
