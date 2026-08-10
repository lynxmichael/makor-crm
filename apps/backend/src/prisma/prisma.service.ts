import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

/**
 * Secrets d'authentification retirés de **toute** lecture, par défaut.
 *
 * Sans cela, il suffit qu'un service inclue la relation utilisateur —
 * `include: { assignedTo: true }`, et quinze services le font — pour que
 * l'empreinte argon2 du mot de passe et le secret TOTP partent dans la
 * réponse HTTP. Mesuré le 10/08 sur `GET /deals/board` et `GET /customers` :
 * n'importe quel utilisateur connecté récupérait les empreintes de toute
 * l'équipe, et le secret 2FA suffit à générer les codes des comptes sensibles.
 *
 * Le filtre est posé ici, au client, et non dans chaque service : une règle
 * qu'il faut penser à réappliquer à chaque nouvelle requête n'en est pas une.
 * Les rares parcours qui doivent vérifier un mot de passe ou un code TOTP les
 * rétablissent explicitement — voir `UsersService.findByEmailForAuth` et
 * `findByIdForAuth`.
 */
const AUTH_SECRETS_OMIT = {
  user: {
    password: true,
    twoFactorSecret: true,
    twoFactorRecoveryCodes: true,
  },
} as const;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({ omit: AUTH_SECRETS_OMIT });
  }

  async onModuleInit() {
    await this.$connect();
  }

  enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
