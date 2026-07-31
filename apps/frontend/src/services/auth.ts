import { http } from "./api";
import type { AuthUser, LoginResult, SessionTokens } from "@/types/api";

/** Endpoints d'authentification — miroir exact de auth.controller.ts. */
export const authService = {
  /** Renvoie soit une session complète, soit un défi 2FA à compléter. */
  login: (email: string, password: string) =>
    http.post<LoginResult>("/auth/login", { email, password }),

  /** Seconde étape : code TOTP à 6 chiffres ou code de secours. */
  loginTwoFactor: (challengeToken: string, code: string) =>
    http.post<SessionTokens>("/auth/login/2fa", { challengeToken, code }),

  refresh: (refreshToken: string) =>
    http.post<SessionTokens>("/auth/refresh", { refreshToken }),

  logout: (refreshToken: string) =>
    http.post<{ success: boolean }>("/auth/logout", { refreshToken }),

  logoutAll: () => http.post<{ success: boolean }>("/auth/logout-all"),

  forgotPassword: (email: string) =>
    http.post<{ message: string }>("/auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    http.post<{ success: boolean }>("/auth/reset-password", { token, password }),

  /**
   * Le backend renvoie le QR déjà encodé en data-URL (`qrCodeDataUrl`), plus
   * l'URI otpauth brute pour les utilisateurs qui saisissent le secret à la
   * main dans leur application d'authentification.
   */
  setupTwoFactor: () =>
    http.post<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }>(
      "/auth/2fa/setup",
    ),

  enableTwoFactor: (code: string) =>
    http.post<{ message: string; recoveryCodes: string[] }>("/auth/2fa/enable", { code }),

  disableTwoFactor: (code: string) =>
    http.post<{ success: boolean }>("/auth/2fa/disable", { code }),

  /** Profil courant — sert à revalider la session au chargement de l'app. */
  me: () => http.get<AuthUser>("/users/me"),
};
