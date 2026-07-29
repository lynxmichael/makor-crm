import { Injectable } from '@nestjs/common';

@Injectable()
export class InvoiceEmailService {
  async sendInvoice(
    email: string,
    invoiceNumber: string,
    pdfPath?: string,
  ): Promise<void> {
    console.log(`Facture ${invoiceNumber} envoyée à ${email}`);

    if (pdfPath) {
      console.log(`Pièce jointe : ${pdfPath}`);
    }

    return;
  }
}
