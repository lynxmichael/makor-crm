import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";

import makorLogo from "@/assets/makor-logo.png";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { firstAllowedPath } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/services/api";
import { isTwoFactorChallenge } from "@/types/auth";

const credentialsSchema = z.object({
  email: z.email("Adresse e-mail invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

const otpSchema = z.object({
  // 6 chiffres pour un code TOTP, jusqu'à 10 caractères pour un code de
  // secours — mêmes bornes que `TwoFactorLoginDto` côté backend.
  code: z
    .string()
    .min(6, "Le code comporte au moins 6 caractères.")
    .max(10, "Le code comporte au plus 10 caractères."),
});

type CredentialsForm = z.infer<typeof credentialsSchema>;
type OtpForm = z.infer<typeof otpSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginTwoFactor, isAuthenticated, role } = useAuth();

  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const credentialsForm = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  async function onCredentials(values: CredentialsForm) {
    setServerError(null);
    try {
      const result = await login(values.email, values.password);

      if (isTwoFactorChallenge(result)) {
        setChallengeToken(result.challengeToken);
        return;
      }

      navigate(firstAllowedPath(result.user.role.name), { replace: true });
    } catch (error) {
      setServerError(errorMessage(error, "Identifiants incorrects."));
    }
  }

  async function onOtp(values: OtpForm) {
    if (!challengeToken) return;
    setServerError(null);
    try {
      const session = await loginTwoFactor(challengeToken, values.code.trim());
      navigate(firstAllowedPath(session.user.role.name), { replace: true });
    } catch (error) {
      setServerError(errorMessage(error, "Code invalide ou expiré."));
    }
  }

  function backToCredentials() {
    setChallengeToken(null);
    setServerError(null);
    otpForm.reset();
  }

  // Une session déjà ouverte ne repasse pas par la connexion.
  if (isAuthenticated && role) {
    return <Navigate to={firstAllowedPath(role)} replace />;
  }

  const step = challengeToken ? "otp" : "credentials";
  const submitting =
    credentialsForm.formState.isSubmitting || otpForm.formState.isSubmitting;

  return (
    <div className="app-ambient relative flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src={makorLogo} alt="MAKOR Group Telecom" className="h-12 w-auto" />
          <p className="text-xs uppercase tracking-[0.18em] text-muted">CRM Enterprise</p>
        </div>

        <div className="card p-8">
          <AnimatePresence mode="wait">
            {step === "credentials" ? (
              <motion.form
                key="credentials"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22 }}
                onSubmit={credentialsForm.handleSubmit(onCredentials)}
                noValidate
                className="space-y-5"
              >
                <div>
                  <h1 className="font-display text-2xl font-extrabold text-text">Connexion</h1>
                  <p className="mt-1 text-sm text-muted">
                    Accédez à votre espace MAKOR CRM.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-text">
                    Adresse e-mail
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    autoFocus
                    placeholder="prenom.nom@makor.ci"
                    aria-invalid={Boolean(credentialsForm.formState.errors.email)}
                    {...credentialsForm.register("email")}
                  />
                  {credentialsForm.formState.errors.email && (
                    <p className="text-xs text-danger">
                      {credentialsForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-text">
                    Mot de passe
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-invalid={Boolean(credentialsForm.formState.errors.password)}
                    {...credentialsForm.register("password")}
                  />
                  {credentialsForm.formState.errors.password && (
                    <p className="text-xs text-danger">
                      {credentialsForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {serverError && (
                  <p
                    role="alert"
                    className="rounded-control bg-danger-bg px-3 py-2 text-sm text-danger"
                  >
                    {serverError}
                  </p>
                )}

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Se connecter
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="otp"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.22 }}
                onSubmit={otpForm.handleSubmit(onOtp)}
                noValidate
                className="space-y-5"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-control bg-primary-soft p-2 text-primary-dark">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h1 className="font-display text-xl font-extrabold text-text">
                      Vérification en deux étapes
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                      Saisissez le code à 6 chiffres affiché par votre application
                      d'authentification, ou l'un de vos codes de secours.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="code" className="text-sm font-medium text-text">
                    Code de vérification
                  </label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={10}
                    placeholder="000000"
                    className="text-center font-mono-tabular text-lg tracking-[0.4em]"
                    aria-invalid={Boolean(otpForm.formState.errors.code)}
                    {...otpForm.register("code")}
                  />
                  {otpForm.formState.errors.code && (
                    <p className="text-xs text-danger">
                      {otpForm.formState.errors.code.message}
                    </p>
                  )}
                </div>

                {serverError && (
                  <p
                    role="alert"
                    className="rounded-control bg-danger-bg px-3 py-2 text-sm text-danger"
                  >
                    {serverError}
                  </p>
                )}

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Vérifier
                </Button>

                <button
                  type="button"
                  onClick={backToCredentials}
                  className="flex w-full items-center justify-center gap-1.5 text-sm text-muted hover:text-primary-dark"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Revenir à l'identification
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          MAKOR Group Telecom — usage interne
        </p>
      </div>
    </div>
  );
}
