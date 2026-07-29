import { Injectable } from '@nestjs/common';

import { PdfService } from '../common/pdf/pdf.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Génère le PDF d'une facture à partir des données Prisma, en s'appuyant
 * sur le service de mise en page générique (partagé avec devis, bons de
 * commande et contrats).
 */
@Injectable()
export class InvoicePdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  async generate(invoiceId: string): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: true,
      },
    });

    const org = await this.prisma.organizationSettings.findFirst();

    return this.pdfService.generateCommercialDocument(
      {
        companyName: org?.companyName ?? 'MAKOR Group Telecom',
        address: org?.address,
        email: org?.email,
        phone: org?.phone,
      },
      {
        documentTitle: 'FACTURE',
        number: invoice.number,
        date: invoice.issuedAt,
        validUntilOrDueDate: invoice.dueDate,
        status: invoice.status,
        customerName: invoice.customer.companyName,
        customerAddress: invoice.customer.address,
        customerEmail: invoice.customer.email,
        customerPhone: invoice.customer.phone,
        items: invoice.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
          total: Number(item.total),
        })),
        subtotal: Number(invoice.subtotal),
        discount: Number(invoice.discount),
        tax: Number(invoice.tax),
        total: Number(invoice.total),
        currency: org?.defaultCurrency ?? 'XOF',
      },
    );
  }
}
