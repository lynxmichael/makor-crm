import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"credentials" | "otp">("credentials");

  function handleCredentials(e: FormEvent) {
    e.preventDefault();
    setStep("otp");
  }

  function handleOtp(e: FormEvent) {
    e.preventDefault();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-wire font-display text-base font-bold text-white">
            M
          </div>
          <div>
            <p className="font-display text-base font-semibold leading-none text-white">MAKOR CRM</p>
            <p className="mt-1 text-[11px] leading-none text-white/45">Group Telecom</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur">
          {step === "credentials" ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <h1 className="font-display text-lg font-semibold text-white">Connexion</h1>
                <p className="mt-1 text-sm text-white/50">Accédez à votre espace commercial</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60">Adresse e-mail</label>
                <Input type="email" placeholder="prenom.nom@makorgroup.com" required className="bg-white/5 text-white placeholder:text-white/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60">Mot de passe</label>
                <Input type="password" placeholder="••••••••" required className="bg-white/5 text-white placeholder:text-white/30" />
              </div>
              <Button type="submit" className="w-full">
                Continuer
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtp} className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-wire" />
                <h1 className="font-display text-lg font-semibold text-white">Vérification en deux étapes</h1>
              </div>
              <p className="text-sm text-white/50">Entrez le code à 6 chiffres envoyé par SMS au +225 07 •• •• 44.</p>
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                required
                className="bg-white/5 text-center font-mono-tabular text-lg tracking-[0.5em] text-white placeholder:text-white/30"
              />
              <Button type="submit" className="w-full">
                Valider et se connecter
              </Button>
              <button
                type="button"
                onClick={() => setStep("credentials")}
                className="w-full text-center text-xs text-white/40 hover:text-white/70"
              >
                Retour
              </button>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-white/30">Démonstration — données fictives</p>
      </div>
    </div>
  );
}
