import { useCallback } from "react";

import * as authService from "@/services/auth";
import { useAuthStore } from "@/store/auth.store";
import { isTwoFactorChallenge, type LoginResult } from "@/types/auth";

/**
 * Session courante et actions de connexion.
 *
 * L'état vit dans le store Zustand (`store/auth.store.ts`), pas dans un
 * contexte React : les intercepteurs axios doivent pouvoir le lire hors de
 * l'arbre de composants.
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const twoFactorSetupRequired = useAuthStore((state) => state.twoFactorSetupRequired);
  const setSession = useAuthStore((state) => state.setSession);
  const clear = useAuthStore((state) => state.clear);

  /** Ouvre la session, ou renvoie le défi 2FA à relayer au second écran. */
  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const result = await authService.login(email, password);

      if (!isTwoFactorChallenge(result)) {
        setSession(result);
      }

      return result;
    },
    [setSession],
  );

  const loginTwoFactor = useCallback(
    async (challengeToken: string, code: string) => {
      const session = await authService.loginTwoFactor(challengeToken, code);
      setSession(session);
      return session;
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    const { refreshToken } = useAuthStore.getState();
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    clear();
  }, [clear]);

  return {
    user,
    role: user?.role.name ?? null,
    accessToken,
    isAuthenticated: Boolean(accessToken && user),
    twoFactorSetupRequired,
    login,
    loginTwoFactor,
    logout,
  };
}

export default useAuth;
