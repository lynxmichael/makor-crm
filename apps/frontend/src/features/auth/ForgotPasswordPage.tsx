import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, MailCheck } from "lucide-react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/Field";
import { authService } from "@/services/auth";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: () => authService.forgotPassword(email),
  });

  // Le backend répond volontairement la même chose que l'adresse existe ou
  // non ; l'interface reprend cette formulation pour rester cohérente.
  if (mutation.isSuccess) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-signal/10 text-signal">
          <MailCheck className="h-5 w-5" />
        </div>
        <h1 className="font-display text-xl font-semibold text-ink">Vérifiez votre boîte mail</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate">{mutation.data.message}</p>
        <Link to="/login" className={buttonStyles({ variant: "ghost", className: "mt-6" })}>
          <ArrowLeft className="h-4 w-4" />
          Revenir à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Mot de passe oublié</h1>
      <p className="mt-2 text-sm text-slate">
        Saisissez votre adresse professionnelle : vous recevrez un lien de réinitialisation valable une heure.
      </p>

      <form
        className="mt-7 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <Field label="Adresse email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="prenom.nom@makor.ci"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Button type="submit" className="w-full" disabled={mutation.isPending || !email}>
          {mutation.isPending ? "Envoi en cours…" : "Envoyer le lien"}
        </Button>

        <Link to="/login" className={buttonStyles({ variant: "ghost", className: "w-full" })}>
          <ArrowLeft className="h-4 w-4" />
          Revenir à la connexion
        </Link>
      </form>
    </div>
  );
}
