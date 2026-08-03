import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';
import { QuotesModule } from '../quotes/quotes.module';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';
import { ContractsModule } from '../contracts/contracts.module';

import { SignaturesController, PublicSignatureController } from './signatures.controller';
import { SignaturesService } from './signatures.service';
import { NativeSignatureProvider } from './native-signature.provider';
import { SIGNATURE_PROVIDER } from './signature-provider.interface';

/**
 * Le prestataire est fourni par jeton : brancher Yousign ou DocuSign
 * consistera à remplacer `NativeSignatureProvider` ici, sans toucher au
 * service ni aux contrôleurs.
 */
@Module({
  imports: [
    PrismaModule,
    AuditModule,
    MailModule,
    QuotesModule,
    PurchaseOrdersModule,
    ContractsModule,
  ],
  controllers: [SignaturesController, PublicSignatureController],
  providers: [
    SignaturesService,
    { provide: SIGNATURE_PROVIDER, useClass: NativeSignatureProvider },
  ],
  exports: [SignaturesService],
})
export class SignaturesModule {}
