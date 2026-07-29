import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface OrganizationHeaderInfo {
  companyName: string;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface PdfLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
}

export interface CommercialDocumentData {
  documentTitle: string; // "DEVIS", "BON DE COMMANDE", "FACTURE", "CONTRAT"
  number: string;
  date: Date;
  validUntilOrDueDate?: Date | null;
  status?: string;
  customerName: string;
  customerAddress?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items?: PdfLineItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  total: number;
  currency?: string;
  notes?: string | null;
  extraLines?: { label: string; value: string }[];
}

/**
 * Génère les PDF commerciaux (devis, bons de commande, contrats, factures).
 * Service volontairement indépendant de Prisma : les modules appelants lui
 * fournissent des données déjà assemblées, ce qui le rend testable et
 * réutilisable pour n'importe quel type de document commercial.
 */
@Injectable()
export class PdfService {
  private formatAmount(value: number, currency = 'XOF'): string {
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);

    return `${formatted} ${currency}`;
  }

  generateCommercialDocument(
    org: OrganizationHeaderInfo,
    data: CommercialDocumentData,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const currency = data.currency ?? 'XOF';

      // --- En-tête ---
      doc.fontSize(18).font('Helvetica-Bold').text(org.companyName, 50, 50);

      doc.fontSize(9).font('Helvetica').fillColor('#555555');
      let y = 72;
      if (org.address) {
        doc.text(org.address, 50, y);
        y += 12;
      }
      const contactLine = [org.email, org.phone].filter(Boolean).join('  •  ');
      if (contactLine) {
        doc.text(contactLine, 50, y);
      }

      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#111111')
        .text(data.documentTitle, 350, 50, { align: 'right' });

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#333333')
        .text(`N° ${data.number}`, 350, 78, { align: 'right' })
        .text(`Date : ${data.date.toLocaleDateString('fr-FR')}`, 350, 92, {
          align: 'right',
        });

      if (data.validUntilOrDueDate) {
        doc.text(
          `Échéance : ${data.validUntilOrDueDate.toLocaleDateString('fr-FR')}`,
          350,
          106,
          { align: 'right' },
        );
      }

      if (data.status) {
        doc.text(`Statut : ${data.status}`, 350, 120, { align: 'right' });
      }

      doc.moveTo(50, 140).lineTo(545, 140).strokeColor('#dddddd').stroke();

      // --- Bloc client ---
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#111111')
        .text('Client', 50, 155);

      doc.font('Helvetica').fillColor('#333333');
      let clientY = 170;
      doc.text(data.customerName, 50, clientY);
      clientY += 14;
      if (data.customerAddress) {
        doc.text(data.customerAddress, 50, clientY);
        clientY += 14;
      }
      if (data.customerEmail) {
        doc.text(data.customerEmail, 50, clientY);
        clientY += 14;
      }
      if (data.customerPhone) {
        doc.text(data.customerPhone, 50, clientY);
        clientY += 14;
      }

      let cursorY = Math.max(clientY, 200) + 20;

      // --- Tableau des lignes ---
      if (data.items && data.items.length > 0) {
        const tableTop = cursorY;
        const col = { desc: 50, qty: 300, price: 360, discount: 440, total: 490 };

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .rect(50, tableTop, 495, 20)
          .fill('#1f2937');

        doc
          .fillColor('#ffffff')
          .text('Description', col.desc + 4, tableTop + 6)
          .text('Qté', col.qty, tableTop + 6)
          .text('P.U.', col.price, tableTop + 6)
          .text('Remise', col.discount, tableTop + 6)
          .text('Total', col.total, tableTop + 6);

        let rowY = tableTop + 20;
        doc.font('Helvetica').fontSize(9).fillColor('#222222');

        data.items.forEach((item, idx) => {
          const rowHeight = 20;
          if (idx % 2 === 1) {
            doc.rect(50, rowY, 495, rowHeight).fill('#f3f4f6');
            doc.fillColor('#222222');
          }

          doc
            .text(item.description, col.desc + 4, rowY + 6, { width: 240 })
            .text(String(item.quantity), col.qty, rowY + 6)
            .text(this.formatAmount(item.unitPrice, currency), col.price, rowY + 6, {
              width: 75,
            })
            .text(
              this.formatAmount(item.discount ?? 0, currency),
              col.discount,
              rowY + 6,
              { width: 45 },
            )
            .text(this.formatAmount(item.total, currency), col.total, rowY + 6, {
              width: 55,
            });

          rowY += rowHeight;
        });

        cursorY = rowY + 20;

        // --- Totaux ---
        const totalsX = 360;
        doc.font('Helvetica').fontSize(10).fillColor('#333333');

        if (data.subtotal !== undefined) {
          doc.text('Sous-total', totalsX, cursorY);
          doc.text(this.formatAmount(data.subtotal, currency), totalsX + 100, cursorY, {
            align: 'right',
            width: 85,
          });
          cursorY += 16;
        }

        if (data.discount) {
          doc.text('Remise', totalsX, cursorY);
          doc.text(this.formatAmount(data.discount, currency), totalsX + 100, cursorY, {
            align: 'right',
            width: 85,
          });
          cursorY += 16;
        }

        if (data.tax !== undefined) {
          doc.text('TVA', totalsX, cursorY);
          doc.text(this.formatAmount(data.tax, currency), totalsX + 100, cursorY, {
            align: 'right',
            width: 85,
          });
          cursorY += 16;
        }

        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('TOTAL', totalsX, cursorY);
        doc.text(this.formatAmount(data.total, currency), totalsX + 100, cursorY, {
          align: 'right',
          width: 85,
        });
        cursorY += 30;
      } else {
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .text('MONTANT', 360, cursorY);
        doc.text(this.formatAmount(data.total, currency), 460, cursorY, {
          align: 'right',
          width: 85,
        });
        cursorY += 30;
      }

      // --- Lignes complémentaires (ex : conditions du contrat) ---
      if (data.extraLines && data.extraLines.length > 0) {
        doc.font('Helvetica').fontSize(9).fillColor('#333333');
        data.extraLines.forEach((line) => {
          doc.text(`${line.label} : ${line.value}`, 50, cursorY);
          cursorY += 14;
        });
        cursorY += 10;
      }

      if (data.notes) {
        doc
          .font('Helvetica-Oblique')
          .fontSize(9)
          .fillColor('#555555')
          .text(data.notes, 50, cursorY, { width: 495 });
      }

      doc
        .fontSize(8)
        .fillColor('#999999')
        .text(
          `Document généré automatiquement par le CRM ${org.companyName}.`,
          50,
          770,
          { width: 495, align: 'center' },
        );

      doc.end();
    });
  }

  /**
   * Génère un rapport tabulaire générique (listes de reporting, CDC
   * §4.15) — en-tête + tableau paginé automatiquement par PDFKit.
   */
  generateTableDocument(
    title: string,
    columns: { label: string; width: number }[],
    rows: string[][],
    subtitle?: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).font('Helvetica-Bold').fillColor('#111111').text(title);

      if (subtitle) {
        doc.fontSize(9).font('Helvetica').fillColor('#666666').text(subtitle);
      }

      doc.moveDown();

      const startX = doc.x;
      let y = doc.y;

      const drawHeader = () => {
        let x = startX;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
        doc.rect(startX, y, columns.reduce((s, c) => s + c.width, 0), 18).fill('#1f2937');
        doc.fillColor('#ffffff');
        for (const col of columns) {
          doc.text(col.label, x + 3, y + 5, { width: col.width - 6 });
          x += col.width;
        }
        y += 18;
      };

      drawHeader();

      doc.font('Helvetica').fontSize(8).fillColor('#222222');

      rows.forEach((row, idx) => {
        if (y > 780) {
          doc.addPage({ size: 'A4', margin: 40, layout: 'landscape' });
          y = doc.y;
          drawHeader();
          doc.font('Helvetica').fontSize(8).fillColor('#222222');
        }

        if (idx % 2 === 1) {
          doc
            .rect(startX, y, columns.reduce((s, c) => s + c.width, 0), 16)
            .fill('#f3f4f6');
          doc.fillColor('#222222');
        }

        let x = startX;
        row.forEach((cell, i) => {
          doc.text(cell ?? '', x + 3, y + 4, {
            width: columns[i].width - 6,
            height: 14,
            ellipsis: true,
          });
          x += columns[i].width;
        });

        y += 16;
      });

      doc.end();
    });
  }
}
