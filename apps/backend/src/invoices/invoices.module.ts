import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicePdfService } from './invoice-pdf.service';

@Module({
  imports: [PrismaModule, MailModule, NotificationsModule, AuditModule],

  controllers: [InvoicesController],

  providers: [InvoicesService, InvoiceNumberService, InvoicePdfService],

  exports: [InvoicesService, InvoiceNumberService, InvoicePdfService],
})
export class InvoicesModule {}
