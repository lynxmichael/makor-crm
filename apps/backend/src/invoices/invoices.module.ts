import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';

import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InstallmentsService } from './installments.service';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    NotificationsModule,
    AuditModule,
    SettingsModule,
  ],

  controllers: [InvoicesController],

  providers: [InvoicesService, InvoiceNumberService, InvoicePdfService, InstallmentsService],

  exports: [InvoicesService, InvoiceNumberService, InvoicePdfService, InstallmentsService],
})
export class InvoicesModule {}
