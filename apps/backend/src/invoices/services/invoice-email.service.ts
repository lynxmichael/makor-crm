import { Injectable } from '@nestjs/common';

@Injectable()
export class InvoiceEmailService {
  // Bouchon : l'envoi réel passera par `MailService`. La signature reste
  // asynchrone pour que les appelants n'aient pas à changer le jour où elle
  // le devient vraiment.
  sendInvoice(
    email: string,
    invoiceNumber: string,
    pdfPath?: string,
  ): Promise<void> {
    console.log(`Facture ${invoiceNumber} envoyée à ${email}`);

    if (pdfPath) {
      console.log(`Pièce jointe : ${pdfPath}`);
    }

    return Promise.resolve();
  }
}
