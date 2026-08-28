import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { RealtimeModule } from '../realtime/realtime.module';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, MailModule, RealtimeModule],

  controllers: [NotificationsController],

  providers: [NotificationsService],

  exports: [NotificationsService],
})
export class NotificationsModule {}
