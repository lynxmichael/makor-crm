import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldOff, SearchX } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { EASE_OUT } from "@/lib/motion";

interface ShellProps {
  code: string;
  title: string;
  detail: string;
  icon: typeof ShieldOff;
  action: { to: string; label: string };
}

function ErrorShell({ code, title, detail, icon: Icon, action }: ShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="max-w-md text-center"
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-white">
          <Icon className="h-6 w-6" />
        </div>

        <p className="font-mono-tabular text-xs font-semibold uppercase tracking-[0.2em] text-slate">
          Erreur {code}
        </p>

        <h1 className="mt-3 font-display text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate">{detail}</p>

        <Link to={action.to} className={buttonStyles({ className: "mt-7" })}>
          {action.label}
        </Link>
      </motion.div>
    </div>
  );
}

export function ForbiddenPage() {
  return (
    <ErrorShell
      code="403"
      title="Cette section ne vous est pas ouverte"
      // On explique la règle plutôt que de s'excuser : l'utilisateur doit
      // savoir quoi faire, pas se demander si l'application a planté.
      detail="Votre rôle ne donne pas accès à ce module. Demandez à un Super Admin d'ajuster vos droits si vous en avez besoin."
      icon={ShieldOff}
      action={{ to: "/", label: "Retour au tableau de bord" }}
    />
  );
}

export function NotFoundPage() {
  return (
    <ErrorShell
      code="404"
      title="Cette page n'existe pas"
      detail="Le lien est peut-être obsolète, ou l'élément a été supprimé depuis."
      icon={SearchX}
      action={{ to: "/", label: "Retour au tableau de bord" }}
    />
  );
}
