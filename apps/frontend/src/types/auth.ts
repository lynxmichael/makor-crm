import type { Role } from "@/config/roles";

/** Permission telle qu'elle arrive de l'API (table `Permission`). */
export interface ApiPermission {
  id: string;
  code: string;
  label: string;
  module: string;
}

export interface ApiRole {
  id: string;
  name: Role;
  description: string | null;
  rolePermissions?: { permission: ApiPermission }[];
}

/** Utilisateur connecté, tel que renvoyé par `sanitizeUser` côté backend. */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  jobTitle: string | null;
  isActive: boolean;
  twoFactorEnabled: boolean;
  roleId: string;
  role: ApiRole;
}

/** Réponse de `POST /auth/login` quand la 2FA est activée sur le compte. */
export interface TwoFactorChallenge {
  requiresTwoFactor: true;
  challengeToken: string;
}

/** Réponse de `POST /auth/login` et `POST /auth/login/2fa` en cas de succès. */
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
  twoFactorSetupRequired: boolean;
}

export type LoginResult = TwoFactorChallenge | AuthSession;

export function isTwoFactorChallenge(result: LoginResult): result is TwoFactorChallenge {
  return "requiresTwoFactor" in result && result.requiresTwoFactor === true;
}

export function initials(user: Pick<AuthUser, "firstName" | "lastName">): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

export function fullName(user: Pick<AuthUser, "firstName" | "lastName">): string {
  return `${user.firstName} ${user.lastName}`.trim();
}
