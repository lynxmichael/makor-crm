import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/Field";
import { authService } from "@/services/auth";
import { useAuthStore } from "@/store/auth.store";
import { isTwoFactorChallenge, type ApiError } from "@/types/api";
import { EASE_OUT } from "@/lib/motion";

/**
 * Connexion en deux temps.
 *
 * Le backend décide s'il faut une seconde étape : on ne devine pas côté
 * client, on réagit à `requiresTwoFactor`. Les deux étapes partagent le même
 * cadre et se remplacent par un glissement latéral, pour que l'utilisateur
 * comprenne qu'il avance dans un même parcours plutôt que de changer d'écran.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";

  const loginMutation = useMutation({
    mutationFn: () => authService.login(email, password),
    onSuccess: (result) => {
      if (isTwoFactorChallenge(result)) {
        setChallengeToken(result.challengeToken);
        return;
      }
      setSession(result);
      navigate(redirectTo, { replace: true });
    },
  });

  const twoFactorMutation = useMutation({
    mutationFn: () => authService.loginTwoFactor(challengeToken!, code),
    onSuccess: (session) => {
      setSession(session);
      navigate(redirectTo, { replace: true });
    },
    onError: () => {
      // Le champ se vide après un refus : l'envoi étant automatique au
      // sixième chiffre, un code erroné laissé en place empêcherait toute
      // nouvelle tentative — la longueur ne changerait plus.
      setCode("");
    },
  });

  const active = challengeToken ? twoFactorMutation : loginMutation;
  const error = active.error as ApiError | null;

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        {!challengeToken ? (
          <motion.div
            key="credentials"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
          >
            <h1 className="font-display text-2xl font-semibold text-ink">Connexion</h1>
            <p className="mt-2 text-sm text-slate">
              Accédez à votre espace MAKOR CRM.
            </p>

            <form
              className="mt-7 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                loginMutation.mutate();
              }}
            >
              <Field label="Adresse email" htmlFor="email" error={error?.fieldErrors?.email}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  placeholder="prenom.nom@makor.ci"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <Field label="Mot de passe" htmlFor="password" error={error?.fieldErrors?.password}>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate transition-colors hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wire"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <FormError message={!error?.fieldErrors ? error?.message : undefined} />

              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Connexion…" : "Se connecter"}
              </Button>

              <Link
                to="/forgot-password"
                className={buttonStyles({ variant: "ghost", size: "sm", className: "w-full" })}
              >
                Mot de passe oublié ?
              </Link>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="two-factor"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
          >
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-wire/10 text-wire">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <h1 className="font-display text-2xl font-semibold text-ink">Vérification en deux étapes</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate">
              Saisissez le code à 6 chiffres affiché par votre application
              d'authentification. Un code de secours fonctionne aussi.
            </p>

            <form
              className="mt-7 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                twoFactorMutation.mutate();
              }}
            >
              <Field label="Code de vérification" htmlFor="code">
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    maxLength={10}
                    placeholder="000000"
                    // Chiffres alignés et espacés : on lit un code, pas un mot.
                    className="pl-9 font-mono-tabular text-lg tracking-[0.3em]"
                    value={code}
                    onChange={(e) => {
                      const next = e.target.value.replace(/\s/g, "");
                      setCode(next);

                      // Validation dès le sixième chiffre : le code TOTP fait
                      // toujours six caractères, et demander une confirmation
                      // après une saisie de longueur connue n'apporte rien.
                      // Le collage depuis l'application d'authentification
                      // déclenche donc l'envoi immédiatement.
                      if (/^\d{6}$/.test(next) && !twoFactorMutation.isPending) {
                        twoFactorMutation.mutate();
                      }
                    }}
                  />
                </div>
              </Field>

              <FormError message={error?.message} />

              {/* Conservé pour les codes de secours, qui ne font pas six
                  chiffres et ne peuvent donc pas déclencher l'envoi
                  automatique. Masqué pendant la vérification d'un code TOTP,
                  où il n'a plus d'objet. */}
              {!/^\d{6}$/.test(code) && (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={twoFactorMutation.isPending || code.length < 6}
                >
                  {twoFactorMutation.isPending ? "Vérification…" : "Vérifier"}
                </Button>
              )}

              {twoFactorMutation.isPending && /^\d{6}$/.test(code) && (
                <p className="flex items-center justify-center gap-2 py-2.5 text-sm text-slate">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Vérification…
                </p>
              )}

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setChallengeToken(null);
                  setCode("");
                  twoFactorMutation.reset();
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Changer de compte
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Bandeau d'erreur : réserve sa place pour ne pas faire sauter le formulaire. */
function FormError({ message }: { message?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18 }}
          role="alert"
          className="overflow-hidden rounded-lg bg-alert/8 px-3 py-2 text-sm text-alert"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
