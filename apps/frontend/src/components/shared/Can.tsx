import { cloneElement, type ReactElement } from "react";

import type { PermissionDomain, PermissionLevel } from "@/config/permissions";
import { usePermission } from "@/hooks/usePermission";

interface CanProps {
  domain: PermissionDomain;
  /** Niveau exigé par l'action encapsulée. Par défaut : écriture. */
  level?: PermissionLevel;
  /** Bouton ou lien à conditionner. */
  children: ReactElement<{
    disabled?: boolean;
    title?: string;
    className?: string;
    "aria-disabled"?: boolean;
  }>;
  /**
   * Masquer au lieu de désactiver. À réserver aux actions dont l'existence
   * même n'a pas de sens pour le rôle — l'approbation d'un Sender ID pour un
   * non-Super Admin (D9), par exemple. Partout ailleurs, désactiver et
   * expliquer vaut mieux que faire disparaître.
   */
  hideWhenDenied?: boolean;
}

/**
 * Conditionne une action à la matrice de droits.
 *
 * Transcrit `applyPermissions()` de la maquette : l'action refusée reste
 * visible, à 45 % d'opacité, curseur barré, et son infobulle donne la raison.
 */
export function Can({ domain, level = "ecriture", children, hideWhenDenied }: CanProps) {
  const { allowed, reason } = usePermission(domain, level);

  if (allowed) {
    return children;
  }

  if (hideWhenDenied) {
    return null;
  }

  return cloneElement(children, {
    disabled: true,
    "aria-disabled": true,
    title: reason,
    className: [children.props.className, "opacity-45 cursor-not-allowed"]
      .filter(Boolean)
      .join(" "),
  });
}
