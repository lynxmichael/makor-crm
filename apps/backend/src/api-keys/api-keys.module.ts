import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../common/common.module';

import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { PartnerApiController } from './partner-api.controller';
import { PartnerApiService } from './partner-api.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiRequestLogInterceptor } from './interceptors/api-request-log.interceptor';

@Module({
  imports: [PrismaModule, AuditModule, CommonModule],
  controllers: [ApiKeysController, PartnerApiController],
  providers: [
    ApiKeysService,
    PartnerApiService,
    ApiKeyGuard,
    // L'intercepteur n'écrit que si `request.apiKey` est renseigné, donc
    // uniquement pour les routes passées par ApiKeyGuard : le déclarer
    // globalement reste sans effet sur le reste de l'application.
    { provide: APP_INTERCEPTOR, useClass: ApiRequestLogInterceptor },
  ],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
