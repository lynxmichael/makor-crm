import { Injectable } from '@nestjs/common';

@Injectable()
export class InvoicePdfService {
  async generate(invoiceId: string): Promise<string> {
    /**
     * Plus tard :
     * - génération PDF
     * - stockage disque
     * - stockage S3
     * - retour du chemin
     */

    return `uploads/invoices/${invoiceId}.pdf`;
  }
}
