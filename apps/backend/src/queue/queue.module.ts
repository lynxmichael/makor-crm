import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

export const CAMPAIGNS_QUEUE = 'campaigns';
export const REPORTING_QUEUE = 'reporting';

/**
 * File d'attente Redis (CDC §2.1 : "File d'envoi des campagnes,
 * extractions de reporting, traitements asynchrones"). Module global :
 * n'importe quel module peut injecter une queue enregistrée ici sans
 * réimporter la configuration de connexion.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: null,
        },
      }),
    }),

    BullModule.registerQueue(
      { name: CAMPAIGNS_QUEUE },
      { name: REPORTING_QUEUE },
    ),
  ],

  exports: [BullModule],
})
export class QueueModule {}
