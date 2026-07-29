import { Module } from '@nestjs/common';

import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { MailModule } from '../mail/mail.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, SettingsModule, MailModule, AuditModule],

  controllers: [QuotesController],

  providers: [QuotesService],

  exports: [QuotesService],
})
export class QuotesModule {}
