import { Global, Module } from '@nestjs/common';

import { PdfService } from './pdf/pdf.service';
import { MockGatewayAdapter } from './gateway/mock-gateway.adapter';
import { SMS_WHATSAPP_GATEWAY } from './gateway/gateway-adapter.interface';

/**
 * Regroupe les services transverses (génération PDF, passerelle
 * SMS/WhatsApp, etc.) et les rend disponibles dans toute l'application
 * sans réimport module par module.
 *
 * Pour brancher un prestataire réel (CDC §2.2), remplacer la classe
 * fournie au jeton SMS_WHATSAPP_GATEWAY ci-dessous par une implémentation
 * de `SmsWhatsappGateway` — aucun autre fichier n'a besoin de changer.
 */
@Global()
@Module({
  providers: [
    PdfService,
    {
      provide: SMS_WHATSAPP_GATEWAY,
      useClass: MockGatewayAdapter,
    },
  ],
  exports: [PdfService, SMS_WHATSAPP_GATEWAY],
})
export class CommonModule {}
