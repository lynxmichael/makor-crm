import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, FileSignature, Loader2, Send, ShieldCheck, User, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/Field";
import { EntitySelect } from "@/components/shared/EntitySelect";

import { http } from "@/services/api";
import { usersService } from "@/services/resources";
import { QK } from "@/config/constants";
import { EASE_OUT } from "@/lib/motion";
import { formatDateTime } from "@/lib/format";
import type { ApiError } from "@/types/api";

type Row = Record<string, unknown> & { id?: unknown };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  VIEWED: "Consulté",
  SIGNED: "Signé",
  REFUSED: "Refusé",
  EXPIRED: "Expiré",
  CANCELLED: "Annulé",
};

const STATUS_TONES: Record<string, "neutral" | "wire" | "signal" | "alert" | "amber"> = {
  PENDING: "neutral",
  VIEWED: "wire",
  SIGNED: "signal",
  REFUSED: "alert",
  EXPIRED: "amber",
  CANCELLED: "neutral",
};

interface Props {
  entityType: "QUOTE" | "PURCHASE_ORDER" | "CONTRACT";
  entityId: string;
  /** Pré-remplissage depuis la fiche client. */
  defaultSignerName?: string;
  defaultSignerEmail?: string;
}

/**
 * Suivi des signatures d'une pièce, à poser sur une facture proforma, un bon de commande
 * ou un contrat. Autonome : il gère son chargement, ses mutations et son
 * cache, comme `CommentThread`.
 */
export function SignaturePanel({
  entityType,
  entityId,
  defaultSignerName = "",
  defaultSignerEmail = "",
}: Props) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerEmail, setSignerEmail] = useState(defaultSignerEmail);
  const [validityDays, setValidityDays] = useState("30");
  const [signerKind, setSignerKind] = useState<"client" | "agent">("client");

  const queryKey = ["signatures", entityType, entityId];

  const query = useQuery({
    queryKey,
    queryFn: () =>
      http.get<Row[]>("/signatures", { params: { entityType, entityId } }),
  });

  const create = useMutation({
    mutationFn: () =>
      http.post<Row>("/signatures", {
        entityType,
        entityId,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim(),
        validityDays: Number(validityDays) || 30,
      }),
    onSuccess: () => {
      toast.success("Demande envoyée au signataire");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => http.delete(`/signatures/${id}`),
    onSuccess: () => {
      toast.success("Demande annulée");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  const requests = query.data ?? [];
  const hasPending = requests.some((r) =>
    ["PENDING", "VIEWED"].includes(String(r.status)),
  );

  return (
    <section className="rounded-xl border border-line bg-surface">
      <header className="flex items-center gap-2 border-b border-line px-5 py-3.5">
        <FileSignature className="h-4 w-4 text-slate" />
        <h2 className="font-display text-sm font-semibold text-ink">Signature électronique</h2>

        {!hasPending && (
          <Button size="sm" className="ml-auto" onClick={() => setOpen((v) => !v)}>
            <Send className="h-3.5 w-3.5" />
            Envoyer à signer
          </Button>
        )}
      </header>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            className="overflow-hidden border-b border-line"
          >
            <div className="space-y-4 px-5 py-4">
              {/* Le modèle ne distingue pas client et agent : un signataire est
                  un nom et une adresse. Le choix ci-dessous ne fait que
                  pré-remplir depuis l'annuaire interne — utile pour une
                  contresignature côté MAKOR. */}
              <div className="flex gap-1 rounded-xl border border-line bg-paper p-1">
                {(
                  [
                    ["client", "Client", Building2],
                    ["agent", "Agent MAKOR", User],
                  ] as const
                ).map(([value, label, Glyph]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSignerKind(value);
                      setSignerName("");
                      setSignerEmail("");
                    }}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      signerKind === value
                        ? "bg-surface text-ink shadow-e1"
                        : "text-slate hover:text-ink"
                    }`}
                  >
                    <Glyph className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {signerKind === "agent" && (
                <Field
                  label="Agent signataire"
                  htmlFor="sg-agent"
                  required
                  hint="Il recevra le même lien personnel que s'il s'agissait d'un client."
                >
                  <EntitySelect
                    id="sg-agent"
                    service={usersService}
                    queryKey={QK.users}
                    value=""
                    onChange={(_id, row) => {
                      if (!row) return;
                      setSignerName(
                        `${String(row.firstName ?? "")} ${String(row.lastName ?? "")}`.trim(),
                      );
                      setSignerEmail(String(row.email ?? ""));
                    }}
                    placeholder="Rechercher un agent"
                    render={(row) => ({
                      label: `${String(row.firstName ?? "")} ${String(row.lastName ?? "")}`,
                      detail: String(row.email ?? ""),
                    })}
                  />
                </Field>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom du signataire" htmlFor="sg-name" required>
                  <Input
                    id="sg-name"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Nom et prénom"
                  />
                </Field>

                <Field label="E-mail" htmlFor="sg-email" required>
                  <Input
                    id="sg-email"
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="signataire@entreprise.ci"
                  />
                </Field>
              </div>

              <Field
                label="Validité du lien (jours)"
                htmlFor="sg-validity"
                hint="Au-delà, le lien cesse de fonctionner."
              >
                <Input
                  id="sg-validity"
                  type="number"
                  min={1}
                  max={365}
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  className="max-w-[140px]"
                />
              </Field>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={() => create.mutate()}
                  disabled={
                    create.isPending ||
                    signerName.trim().length < 2 ||
                    !signerEmail.includes("@")
                  }
                >
                  {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Envoyer
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 py-4">
        {query.isPending ? (
          <p className="text-sm text-slate">Chargement…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm leading-relaxed text-slate">
            Aucune demande de signature. Le signataire recevra un lien personnel par e-mail ; il
            n'a pas besoin de compte sur le CRM.
          </p>
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => {
              const status = String(request.status ?? "");

              return (
                <li
                  key={String(request.id)}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {String(request.signerName ?? "")}
                    </p>
                    <p className="truncate text-xs text-slate">
                      {String(request.signerEmail ?? "")}
                      {request.signedAt
                        ? ` · signé le ${formatDateTime(request.signedAt as string)}`
                        : request.viewedAt
                          ? ` · consulté le ${formatDateTime(request.viewedAt as string)}`
                          : ""}
                    </p>
                    {request.refusalReason && (
                      <p className="mt-0.5 text-xs text-alert">
                        Motif : {String(request.refusalReason)}
                      </p>
                    )}
                  </div>

                  <Badge tone={STATUS_TONES[status] ?? "neutral"}>
                    {STATUS_LABELS[status] ?? status}
                  </Badge>

                  {status === "SIGNED" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          const proof = await http.get<Row>(
                            `/signatures/${String(request.id)}/proof`,
                          );
                          void navigator.clipboard.writeText(JSON.stringify(proof, null, 2));
                          toast.success("Certificat de preuve copié");
                        } catch (error) {
                          toast.error((error as ApiError).message);
                        }
                      }}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Preuve
                    </Button>
                  )}

                  {["PENDING", "VIEWED"].includes(status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-alert hover:bg-alert/10"
                      onClick={() => cancel.mutate(String(request.id))}
                      disabled={cancel.isPending}
                      aria-label="Annuler la demande"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
