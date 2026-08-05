import { api } from "@/services/api";
import type { AuthSession, LoginResult } from "@/types/auth";

/**
 * Première étape de connexion.
 *
 * Renvoie soit une session complète, soit un défi 2FA — le backend décide
 * selon que le compte a la double authentification activée. L'appelant
 * distingue les deux avec `isTwoFactorChallenge`.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const { data } = await api.post<LoginResult>("/auth/login", { email, password });
  return data;
}

/** Seconde étape : code TOTP à 6 chiffres ou code de secours. */
export async function loginTwoFactor(
  challengeToken: string,
  code: string,
): Promise<AuthSession> {
  const { data } = await api.post<AuthSession>("/auth/login/2fa", {
    challengeToken,
    code,
  });
  return data;
}

/**
 * Déconnexion de l'appareil courant.
 *
 * Révoque le refresh token côté serveur. L'échec est volontairement ignoré :
 * une session déjà expirée ne doit pas empêcher de se déconnecter.
 */
export async function logout(refreshToken: string): Promise<void> {
  try {
    await api.post("/auth/logout", { refreshToken });
  } catch {
    /* la session locale est effacée quoi qu'il arrive */
  }
}
