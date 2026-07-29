import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { SenderIdController } from './sender-id.controller';
import { SenderIdService } from './sender-id.service';

@Module({
  imports: [PrismaModule, MailModule, NotificationsModule],

  controllers: [SenderIdController],

  providers: [SenderIdService],

  exports: [SenderIdService],
})
export class SenderIdModule {}
