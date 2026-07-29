import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignsProcessor } from './campaigns.processor';

@Module({
  // QueueModule et CommonModule sont globaux (déclarés une fois dans
  // AppModule) : la Queue BullMQ et la passerelle SMS/WhatsApp sont
  // déjà injectables ici sans réimport.
  imports: [PrismaModule, NotificationsModule, AuditModule],

  controllers: [CampaignsController],

  providers: [CampaignsService, CampaignsProcessor],

  exports: [CampaignsService],
})
export class CampaignsModule {}
