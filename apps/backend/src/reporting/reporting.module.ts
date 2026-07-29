import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';

import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';

@Module({
  // CommonModule est global : PdfService est déjà injectable ici.
  imports: [PrismaModule, SettingsModule],

  controllers: [ReportingController],

  providers: [ReportingService],
})
export class ReportingModule {}
