import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Rôles pour lesquels le CDC §2.4 impose la double authentification. */
export const TWO_FACTOR_MANDATORY_ROLES = ['SUPER_ADMIN', 'ADMIN_VENTES', 'MANAGER'];

/**
 * Règle d'obligation de la 2FA, isolée dans son propre fournisseur.
 *
 * Elle est consommée par `AuthService` à la connexion et par `UsersController`
 * sur `/users/me`. La placer dans l'un des deux aurait créé une dépendance
 * circulaire entre les modules — et surtout, cette règle doit avoir une seule
 * implémentation : le frontend ne doit jamais la redériver de son côté, sans
 * quoi les deux finissent par diverger.
 */
@Injectable()
export class TwoFactorPolicy {
  constructor(private readonly config: ConfigService) {}

  /**
   * Échappatoire de développement : `TWO_FACTOR_ENFORCED=false` lève
   * l'obligation, pour dérouler des tests sans application
   * d'authentification sous la main.
   *
   * Volontairement sans effet en production. Une bascule de sécurité qui
   * dépend de la seule vigilance de celui qui déploie finit toujours par
   * partir en production un vendredi soir : ici, même positionnée à `false`,
   * la variable est ignorée dès que `NODE_ENV` vaut `production`.
   */
  isEnforced(): boolean {
    if (this.config.get<string>('NODE_ENV') === 'production') return true;
    return this.config.get<string>('TWO_FACTOR_ENFORCED') !== 'false';
  }

  /** Ce compte doit-il configurer sa 2FA avant d'accéder au reste du CRM ? */
  isSetupRequiredFor(user: {
    twoFactorEnabled?: boolean | null;
    role?: { name?: string | null } | null;
  }): boolean {
    return (
      this.isEnforced() &&
      !user.twoFactorEnabled &&
      TWO_FACTOR_MANDATORY_ROLES.includes(user.role?.name ?? '')
    );
  }
}
