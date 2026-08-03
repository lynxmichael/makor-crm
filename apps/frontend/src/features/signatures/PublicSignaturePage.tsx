import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, Check, FileText, Loader2, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Textarea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/skeleton";

import { env } from "@/config/env";
import { EASE_OUT } from "@/lib/motion";
import { formatDate } from "@/lib/format";

type Row = Record<string, unknown>;

/**
 * Parcours de signature du client — page PUBLIQUE.
 *
 * Le signataire n'a pas de compte : l'accès tient au jeton contenu dans
 * l'URL. On n'utilise donc pas l'instance axios de l'application, qui
 * ajouterait un en-tête d'autorisation et déclencherait le renouvellement
 * de session sur un 401 — comportements sans objet ici.
 */
async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (payload as Row)?.message
        ? String((payload as Row).message)
        : "Ce lien de signature n'est plus valide.",
    );
  }

  return payload as T;
}

export function PublicSignaturePage() {
  const { token = "" } = useParams();

  const [fullName, setFullName] = useState("");
  const [consent, setConsent] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState<"signed" | "refused" | null>(null);

  const request = useQuery({
    queryKey: ["public-signature", token],
    queryFn: () => publicFetch<Row>(`/sign/${token}`),
    retry: false,
  });

  useEffect(() => {
    if (request.data?.signerName) setFullName(String(request.data.signerName));
  }, [request.data]);

  const sign = useMutation({
    mutationFn: () =>
      publicFetch(`/sign/${token}`, {
        method: "POST",
        body: JSON.stringify({ signatureData: fullName.trim(), signatureType: "typed" }),
      }),
    onSuccess: () => setOutcome("signed"),
  });

  const refuse = useMutation({
    mutationFn: () =>
      publicFetch(`/sign/${token}/refuse`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      }),
    onSuccess: () => setOutcome("refused"),
  });

  const status = String(request.data?.status ?? "");
  const alreadyResolved = ["SIGNED", "REFUSED", "EXPIRED", "CANCELLED"].includes(status);

  return (
    <div className="min-h-screen bg-paper px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 text-center">
          <p className="font-display text-lg font-semibold tracking-tight text-ink">
            MAKOR Group Telecom
          </p>
          <p className="mt-1 text-sm text-slate">Signature électronique de document</p>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="rounded-2xl border border-line bg-surface p-6 sm:p-8"
        >
          {request.isPending ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : request.isError ? (
            <div className="py-8 text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-alert/10 text-alert">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <h1 className="font-display text-lg font-semibold text-ink">Lien indisponible</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate">
                {(request.error as Error).message} Contactez votre interlocuteur commercial pour
                en recevoir un nouveau.
              </p>
            </div>
          ) : outcome ? (
            <div className="py-8 text-center">
              <span
                className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
                  outcome === "signed" ? "bg-signal/10 text-signal" : "bg-slate/10 text-slate"
                }`}
              >
                {outcome === "signed" ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <X className="h-6 w-6" />
                )}
              </span>
              <h1 className="font-display text-lg font-semibold text-ink">
                {outcome === "signed" ? "Document signé" : "Signature refusée"}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate">
                {outcome === "signed"
                  ? "Votre signature a été enregistrée. Une copie du document signé vous a été envoyée par e-mail."
                  : "Votre refus a été transmis. Votre interlocuteur commercial vous recontactera."}
              </p>
            </div>
          ) : alreadyResolved ? (
            <div className="py-8 text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-paper text-slate">
                <FileText className="h-6 w-6" />
              </span>
              <h1 className="font-display text-lg font-semibold text-ink">
                {status === "SIGNED"
                  ? "Ce document a déjà été signé"
                  : status === "EXPIRED"
                    ? "Ce lien a expiré"
                    : "Cette demande n'est plus active"}
              </h1>
              {request.data?.signedAt && (
                <p className="mt-2 text-sm text-slate">
                  Signé le {formatDate(request.data.signedAt as string)}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-xl font-semibold tracking-tight text-ink">
                  {String(request.data?.documentName ?? "Document")}
                </h1>
                <p className="mt-1 text-sm text-slate">
                  Adressé à {String(request.data?.signerName ?? "")}
                  {request.data?.expiresAt &&
                    ` · à signer avant le ${formatDate(request.data.expiresAt as string)}`}
                </p>
              </div>

              {/* Le document est affiché avant toute demande de signature :
                  signer sans avoir pu lire ne vaudrait rien. */}
              <object
                data={`${env.apiUrl}/sign/${token}/document`}
                type="application/pdf"
                className="h-[420px] w-full rounded-xl border border-line"
              >
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <FileText className="h-8 w-8 text-slate" />
                  <p className="text-sm text-slate">
                    L'aperçu ne s'affiche pas dans ce navigateur.
                  </p>
                  <a
                    href={`${env.apiUrl}/sign/${token}/document`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-wire underline-offset-2 hover:underline"
                  >
                    Ouvrir le document
                  </a>
                </div>
              </object>

              {refusing ? (
                <div className="space-y-3 rounded-xl border border-line bg-paper/50 p-4">
                  <Field label="Motif du refus" htmlFor="s-reason" required>
                    <Textarea
                      id="s-reason"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Précisez ce qui doit être revu…"
                      autoFocus
                    />
                  </Field>

                  {refuse.isError && (
                    <p className="text-sm text-alert">{(refuse.error as Error).message}</p>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setRefusing(false)}>
                      Retour
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => refuse.mutate()}
                      disabled={refuse.isPending || reason.trim().length < 3}
                    >
                      {refuse.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Confirmer le refus
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 rounded-xl border border-line bg-paper/50 p-4">
                  <Field
                    label="Votre nom complet"
                    htmlFor="s-name"
                    required
                    hint="La saisie de votre nom vaut signature."
                  >
                    <Input
                      id="s-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </Field>

                  <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed text-ink">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-wire"
                    />
                    J'ai lu le document ci-dessus et j'en accepte les termes. Je reconnais que
                    cette signature électronique a la même valeur qu'une signature manuscrite.
                  </label>

                  <p className="flex items-start gap-2 text-xs leading-relaxed text-slate">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    La date, votre adresse IP et l'empreinte du document sont enregistrées comme
                    éléments de preuve.
                  </p>

                  {sign.isError && (
                    <p className="text-sm text-alert">{(sign.error as Error).message}</p>
                  )}

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="secondary" onClick={() => setRefusing(true)}>
                      Refuser
                    </Button>
                    <Button
                      onClick={() => sign.mutate()}
                      disabled={sign.isPending || !consent || fullName.trim().length < 2}
                    >
                      {sign.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Signer le document
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.main>

        <p className="mt-6 text-center text-xs text-slate">
          Ce lien vous est personnel. Ne le transmettez à personne.
        </p>
      </div>
    </div>
  );
}
