import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

/**
 * Rappel de mise en place de la double authentification.
 *
 * Le backend rend `twoFactorSetupRequired` à la connexion pour les rôles où
 * la 2FA est obligatoire (CDC §8.2) et qui ne l'ont pas encore configurée. En
 * étape 1 on se contente de le signaler : l'écran d'enrôlement, avec son QR
 * code, viendra avec le module Paramètres.
 */
export function TwoFactorBanner() {
  const { twoFactorSetupRequired } = useAuth();

  if (!twoFactorSetupRequired) return null;

  return (
    <div
      role="status"
      className="mb-5 flex items-start gap-3 rounded-card border border-warning/25 bg-warning-bg px-4 py-3"
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="text-sm text-text">
        <strong className="font-semibold">
          La double authentification est obligatoire pour votre rôle.
        </strong>{" "}
        <span className="text-muted">
          Elle n'est pas encore activée sur votre compte. L'écran de mise en place
          arrive avec le module Paramètres.
        </span>
      </p>
    </div>
  );
}
