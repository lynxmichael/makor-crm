import { Injectable } from '@nestjs/common';

@Injectable()
export class InvoiceEmailService {
  sendInvoice(
    email: string,
    invoiceNumber: string,
    pdfPath?: string,
  ): Promise<void> {

    /**
     * Cette classe appellera MailService.
     * Plus tard on pourra :
     *
     * - envoyer le PDF
     * - envoyer plusieurs modèles
     * - envoyer en arrière-plan (BullMQ)
     */

    console.log(`Facture ${invoiceNumber} envoyée à ${email}`);

  }

}
