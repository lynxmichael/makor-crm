import { Module } from '@nestjs/common';

import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';

import { PrismaModule } from '../prisma/prisma.module';
import { QuotesModule } from '../quotes/quotes.module';
import { SettingsModule } from '../settings/settings.module';
import { MailModule } from '../mail/mail.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    QuotesModule,
    SettingsModule,
    MailModule,
    AuditModule,
  ],

  controllers: [PurchaseOrdersController],

  providers: [PurchaseOrdersService],

  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
