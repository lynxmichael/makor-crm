import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
