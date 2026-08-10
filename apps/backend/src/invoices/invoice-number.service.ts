import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Génère des numéros de facture séquentiels et uniques (format INV-000001).
 * S'appuie sur le dernier numéro connu plutôt que sur un COUNT() pour
 * rester correct même après suppression d'anciennes factures.
 */
@Injectable()
export class InvoiceNumberService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    const lastInvoice = await this.prisma.invoice.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!lastInvoice) {
      return 'INV-000001';
    }

    const number = Number(lastInvoice.number.replace('INV-', ''));

    return `INV-${String(number + 1).padStart(6, '0')}`;
  }
}
