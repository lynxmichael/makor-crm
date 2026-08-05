import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Ouvre une route à l'anonyme.
 *
 * Depuis D16, `JwtAuthGuard` est enregistré en `APP_GUARD` : toute route est
 * authentifiée par défaut et l'ouverture doit être explicite. C'est ce qui
 * empêche qu'un contrôleur reste exposé par simple oubli — le défaut de la
 * configuration précédente, qui avait laissé cinq contrôleurs ouverts.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
