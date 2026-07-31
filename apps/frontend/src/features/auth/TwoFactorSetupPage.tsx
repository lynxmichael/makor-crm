import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Copy, Download, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/skeleton";

import { authService } from "@/services/auth";
import { useAuthStore } from "@/store/auth.store";
import { EASE_OUT } from "@/lib/motion";
import type { ApiError } from "@/types/api";

type Step = "scan" | "verify" | "recovery";

/**
 * Mise en place de la double authentification (CDC §2.4).
 *
 * Cet écran s'affiche pour un compte déjà authentifié : le backend délivre
 * bien les jetons à la connexion, il signale seulement que le rôle impose la
 * 2FA. C'est donc une étape post-connexion, pas une seconde étape de
 * connexion — celle-là est gérée dans LoginPage.
 */
export function TwoFactorSetupPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const completeSetup = useAuthStore((s) => s.completeTwoFactorSetup);

  const [step, setStep] = useState<Step>("scan");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);

  // Le secret est généré et stocké côté serveur dès cet appel ; on ne le
  // relance donc pas à chaque rendu.
  const setup = useQuery({
    queryKey: ["auth", "2fa", "setup"],
    queryFn: () => authService.setupTwoFactor(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const enable = useMutation({
    mutationFn: () => authService.enableTwoFactor(code.trim()),
    onSuccess: (result) => {
      setRecoveryCodes(result.recoveryCodes);
      setStep("recovery");
    },
    onError: (error) => toast.error((error as ApiError).message),
  });

  function finish() {
    completeSetup();
    toast.success("Double authentification activée");
    navigate("/", { replace: true });
  }

  function downloadCodes() {
    const content = [
      "Codes de secours — CRM MAKOR",
      `Compte : ${user?.email ?? ""}`,
      `Générés le ${new Date().toLocaleString("fr-FR")}`,
      "",
      "Chaque code ne fonctionne qu'une seule fois.",
      "",
      ...recoveryCodes,
    ].join("\n");

    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "codes-secours-makor.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-xl py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="rounded-2xl border border-line bg-surface p-6 sm:p-8"
      >
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wire/10 text-wire">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-ink">
              Sécuriser votre compte
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-slate">
              Votre rôle donne accès à des données sensibles. La double authentification est
              obligatoire avant d'aller plus loin.
            </p>
          </div>
        </div>

        {/* Étapes */}
        <ol className="mb-6 flex gap-2 text-xs">
          {(["scan", "verify", "recovery"] as Step[]).map((s, index) => {
            const labels = { scan: "Application", verify: "Vérification", recovery: "Codes de secours" };
            const done = (["scan", "verify", "recovery"] as Step[]).indexOf(step) > index;
            const current = step === s;

            return (
              <li
                key={s}
                className={`flex-1 rounded-lg border px-3 py-2 ${
                  current
                    ? "border-wire/30 bg-wire/5 text-ink"
                    : done
                      ? "border-line bg-paper text-slate"
                      : "border-line text-slate"
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  {done && <Check className="h-3 w-3" />}
                  {labels[s]}
                </span>
              </li>
            );
          })}
        </ol>

        {step === "scan" && (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-ink">
              Scannez ce QR code avec Google Authenticator, Microsoft Authenticator, Authy ou
              l'application de votre choix.
            </p>

            <div className="flex justify-center rounded-xl border border-line bg-paper p-6">
              {setup.isPending ? (
                <Skeleton className="h-44 w-44" />
              ) : setup.isError ? (
                <p className="text-sm text-alert">{(setup.error as ApiError).message}</p>
              ) : (
                <img
                  src={setup.data.qrCodeDataUrl}
                  alt="QR code de configuration de la double authentification"
                  className="h-44 w-44"
                />
              )}
            </div>

            {setup.data && (
              <div className="rounded-lg bg-paper p-3">
                <p className="text-xs text-slate">
                  Impossible de scanner ? Saisissez cette clé à la main :
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="font-mono-tabular flex-1 break-all text-sm text-ink">
                    {setup.data.secret}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void navigator.clipboard.writeText(setup.data.secret);
                      toast.success("Clé copiée");
                    }}
                    aria-label="Copier la clé"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={() => setStep("verify")} disabled={!setup.data}>
              J'ai ajouté le compte
            </Button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-ink">
              Saisissez le code à six chiffres affiché par votre application. Il change toutes les
              trente secondes.
            </p>

            <Field label="Code de vérification" htmlFor="code" required>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                className="font-mono-tabular text-center text-lg tracking-[0.4em]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && code.length === 6) enable.mutate();
                }}
              />
            </Field>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep("scan")}>
                Retour
              </Button>
              <Button
                className="flex-1"
                onClick={() => enable.mutate()}
                disabled={enable.isPending || code.length !== 6}
              >
                {enable.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Activer
              </Button>
            </div>
          </div>
        )}

        {step === "recovery" && (
          <div className="space-y-5">
            <div className="flex items-start gap-2 rounded-lg border border-amber/25 bg-amber/5 p-3">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
              <p className="text-sm leading-relaxed text-ink">
                Conservez ces codes hors de l'application. Ils permettent de vous reconnecter si
                vous perdez votre téléphone, ne servent qu'une fois chacun, et{" "}
                <strong>ne seront plus jamais affichés</strong>.
              </p>
            </div>

            <ul className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-paper p-4">
              {recoveryCodes.map((recoveryCode) => (
                <li
                  key={recoveryCode}
                  className="font-mono-tabular rounded bg-surface px-3 py-2 text-center text-sm text-ink"
                >
                  {recoveryCode}
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={downloadCodes}>
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  void navigator.clipboard.writeText(recoveryCodes.join("\n"));
                  toast.success("Codes copiés");
                }}
              >
                <Copy className="h-4 w-4" />
                Copier
              </Button>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line accent-wire"
              />
              J'ai conservé ces codes en lieu sûr.
            </label>

            <Button className="w-full" onClick={finish} disabled={!acknowledged}>
              Accéder au CRM
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
