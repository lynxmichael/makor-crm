import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AuthSession, AuthUser } from "@/types/auth";
import type { Role } from "@/config/roles";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  /** Le backend le signale pour les rôles à 2FA obligatoire (CDC §8.2). */
  twoFactorSetupRequired: boolean;

  setSession: (session: AuthSession) => void;
  /** Renouvellement silencieux : seuls les jetons changent. */
  setTokens: (accessToken: string, refreshToken: string) => void;
  clear: () => void;
}

/**
 * Session courante.
 *
 * Persistée dans `localStorage` pour survivre à un rafraîchissement de page.
 * Le jeton d'accès est de courte durée (15 min par défaut côté backend) et le
 * refresh token est rotatif : c'est le compromis retenu pour une application
 * interne, où l'alternative — cookie httpOnly — supposerait que l'API et le
 * frontend partagent un domaine, ce qui n'est pas le cas ici.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      twoFactorSetupRequired: false,

      setSession: (session) =>
        set({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          user: session.user,
          twoFactorSetupRequired: session.twoFactorSetupRequired,
        }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          twoFactorSetupRequired: false,
        }),
    }),
    { name: "makor-auth" },
  ),
);

/** Rôle de l'utilisateur connecté, `null` hors session. */
export function useCurrentRole(): Role | null {
  return useAuthStore((state) => state.user?.role.name ?? null);
}
