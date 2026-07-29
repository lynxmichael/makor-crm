import { Module } from '@nestjs/common';

import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { MailModule } from '../mail/mail.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, SettingsModule, MailModule, AuditModule],

  controllers: [ContractsController],

  providers: [ContractsService],

  exports: [ContractsService],
})
export class ContractsModule {}
