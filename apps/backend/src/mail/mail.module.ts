import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { MailerModule } from '@nestjs-modules/mailer';

import { MailService } from './mail.service';

@Module({
  imports: [
    /**
     * Configuration résolue à l'exécution, via ConfigService.
     *
     * `forRoot` lisait `process.env` au moment où le décorateur est évalué —
     * c'est-à-dire pendant l'import des modules, avant que ConfigModule
     * n'ait chargé le fichier .env. Le transport se retrouvait donc
     * configuré avec des valeurs indéfinies, et l'envoi échouait sans que
     * la cause soit visible.
     */
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const port = Number(config.get<string>('MAIL_PORT') ?? 587);
        const user = config.get<string>('MAIL_USER');
        const password = config.get<string>('MAIL_PASSWORD');

        return {
          transport: {
            host: config.get<string>('MAIL_HOST'),
            port,

            // 465 impose TLS dès la connexion ; 587 et 25 démarrent en clair
            // puis basculent par STARTTLS. Figer `secure: false` empêchait
            // tout envoi sur 465, configuration pourtant courante.
            secure: port === 465,

            // Un serveur SMTP local ou de test n'exige pas toujours
            // d'authentification : passer un objet auth vide la ferait
            // échouer alors qu'aucune identification n'est attendue.
            ...(user ? { auth: { user, pass: password } } : {}),
          },

          defaults: {
            from: config.get<string>('MAIL_FROM') ?? 'MAKOR CRM <no-reply@makor.ci>',
          },
        };
      },
    }),
  ],

  providers: [MailService],

  exports: [MailService],
})
export class MailModule {}
