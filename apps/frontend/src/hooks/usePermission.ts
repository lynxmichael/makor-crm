import {
  denialReason,
  hasPermission,
  permissionLevel,
  type PermissionDomain,
  type PermissionLevel,
} from "@/config/permissions";
import { useAuthStore } from "@/store/auth.store";

export interface PermissionState {
  level: PermissionLevel;
  allowed: boolean;
  /** Raison du refus, `undefined` si l'action est permise. */
  reason?: string;
}

/**
 * Droit de l'utilisateur connecté sur un domaine.
 *
 * Reprend `applyPermissions()` de la maquette : ce qui est interdit reste
 * visible, désactivé, et dit pourquoi.
 */
export function usePermission(
  domain: PermissionDomain,
  required: PermissionLevel = "ecriture",
): PermissionState {
  const role = useAuthStore((state) => state.user?.role.name ?? null);

  if (!role) {
    return { level: "aucun", allowed: false, reason: "Session expirée." };
  }

  const allowed = hasPermission(role, domain, required);

  return {
    level: permissionLevel(role, domain),
    allowed,
    reason: allowed ? undefined : denialReason(role, domain),
  };
}
