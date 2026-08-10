import { Injectable } from '@nestjs/common';

@Injectable()
export class InvoicePdfService {
  // Bouchon : la génération réelle passera par `PdfService`. La signature reste
  // asynchrone pour que les appelants n'aient pas à changer ensuite.
  generate(invoiceId: string): Promise<string> {
    /**
     * Plus tard :
     * - génération PDF
     * - stockage disque
     * - stockage S3
     * - retour du chemin
     */

    return Promise.resolve(`uploads/invoices/${invoiceId}.pdf`);
  }
}
