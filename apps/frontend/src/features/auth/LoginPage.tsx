import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import makorLogo from "@/assets/makor-logo.png";

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
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-8 flex flex-col items-center gap-3"
        >
          <img src={makorLogo} alt="Makor Telecoms" className="h-10 w-auto select-none" draggable={false} />
          <span className="rounded-md border border-white/15 px-2 py-0.5 font-mono-tabular text-[10px] font-semibold uppercase tracking-widest text-white/50">
            CRM · Group Telecom
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur"
        >
          <AnimatePresence mode="wait" initial={false}>
            {step === "credentials" ? (
              <motion.form
                key="credentials"
                onSubmit={handleCredentials}
                className="space-y-4"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
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
              </motion.form>
            ) : (
              <motion.form
                key="otp"
                onSubmit={handleOtp}
                className="space-y-4"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
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
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
        <p className="mt-6 text-center text-xs text-white/30">Démonstration — données fictives</p>
      </div>
    </div>
  );
}
