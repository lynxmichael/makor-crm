import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { RealtimeGateway } from './realtime.gateway';

@Module({
  // Réutilise le JwtModule déjà configuré (même secret que l'API REST)
  // exporté par AuthModule, plutôt que de dupliquer sa configuration.
  imports: [AuthModule],

  providers: [RealtimeGateway],

  exports: [RealtimeGateway],
})
export class RealtimeModule {}
