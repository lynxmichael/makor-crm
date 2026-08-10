import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { LeadSource } from '@prisma/client';
import * as ExcelJS from 'exceljs';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/** Compte rendu ligne par ligne, pour que l'utilisateur sache quoi corriger. */
export interface ImportReport {
  total: number;
  created: number;
  skipped: number;
  errors: { line: number; reason: string }[];
}

/**
 * En-têtes reconnus, en français comme en anglais.
 *
 * Un import qui exige un gabarit précis est un import qu'on n'utilise pas :
 * les fichiers viennent d'un tableur, d'un ancien CRM ou d'un export
 * d'opérateur, et les colonnes ne portent jamais le même nom.
 */
const HEADERS: Record<string, string[]> = {
  firstName: ['prenom', 'prénom', 'firstname', 'first name'],
  lastName: ['nom', 'lastname', 'last name', 'nom de famille'],
  email: ['email', 'e-mail', 'mail', 'courriel'],
  phone: ['telephone', 'téléphone', 'phone', 'tel', 'mobile', 'numero', 'numéro'],
  company: ['entreprise', 'societe', 'société', 'company', 'organisation'],
  jobTitle: ['fonction', 'poste', 'jobtitle', 'job title', 'titre'],
  country: ['pays', 'country'],
  city: ['ville', 'city'],
  sector: ['secteur', 'sector', 'activite', 'activité'],
};

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

@Injectable()
export class DirectoryImportService {
  private readonly logger = new Logger(DirectoryImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Import d'un fichier Excel ou CSV.
   *
   * `customerId` absent : les lignes deviennent des prospects. Présent :
   * elles deviennent des contacts rattachés à ce client.
   *
   * Les doublons sont écartés sur l'e-mail ou le téléphone, pas créés en
   * double : un même fichier réimporté par erreur ne doit pas doubler
   * l'annuaire.
   */
  async importFile(
    file: Express.Multer.File,
    options: { customerId?: string; assignedToId?: string },
    actorId: string,
  ): Promise<ImportReport> {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');

    const workbook = new ExcelJS.Workbook();

    try {
      if (file.originalname.toLowerCase().endsWith('.csv')) {
        await workbook.csv.read(this.toStream(file.buffer));
      } else {
        await workbook.xlsx.load(file.buffer as never);
      }
    } catch {
      throw new BadRequestException(
        'Fichier illisible. Formats acceptés : .xlsx et .csv.',
      );
    }

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      throw new BadRequestException(
        'Le fichier ne contient aucune donnée sous la ligne d’en-têtes.',
      );
    }

    const columns = this.mapHeaders(sheet.getRow(1));

    if (columns.firstName === undefined && columns.lastName === undefined) {
      throw new BadRequestException(
        'Aucune colonne de nom trouvée. Attendu au moins « Nom » ou « Prénom » en première ligne.',
      );
    }

    const report: ImportReport = { total: 0, created: 0, skipped: 0, errors: [] };

    for (let i = 2; i <= sheet.rowCount; i += 1) {
      const row = sheet.getRow(i);
      const read = (key: string) => {
        const index = columns[key];
        if (index === undefined) return undefined;
        const cell = row.getCell(index).value;
        if (cell === null || cell === undefined) return undefined;
        const text = typeof cell === 'object' && 'text' in cell ? String(cell.text) : String(cell);
        return text.trim() || undefined;
      };

      const firstName = read('firstName');
      const lastName = read('lastName');

      // Une ligne entièrement vide en fin de feuille est courante : on la
      // saute sans la signaler comme erreur.
      if (!firstName && !lastName && !read('email') && !read('phone')) continue;

      report.total += 1;

      if (!lastName && !firstName) {
        report.errors.push({ line: i, reason: 'Ni nom ni prénom.' });
        continue;
      }

      const email = read('email');
      const phone = read('phone');

      try {
        const duplicate = await this.findDuplicate(email, phone, options.customerId);

        if (duplicate) {
          report.skipped += 1;
          continue;
        }

        if (options.customerId) {
          await this.prisma.contact.create({
            data: {
              firstName: firstName ?? '—',
              lastName: lastName ?? '—',
              email,
              phone,
              jobTitle: read('jobTitle'),
              customerId: options.customerId,
              assignedToId: options.assignedToId,
            },
          });
        } else {
          await this.prisma.lead.create({
            data: {
              firstName: firstName ?? '—',
              lastName: lastName ?? '—',
              email,
              phone,
              jobTitle: read('jobTitle'),
              company: read('company'),
              country: read('country'),
              city: read('city'),
              sector: read('sector'),
              source: LeadSource.OTHER,
              assignedToId: options.assignedToId,
            },
          });
        }

        report.created += 1;
      } catch (error) {
        report.errors.push({
          line: i,
          reason: error instanceof Error ? error.message : 'Erreur inconnue.',
        });
      }
    }

    await this.audit.create({
      action: 'CREATE',
      entity: options.customerId ? 'Contact' : 'Lead',
      description:
        `Import annuaire « ${file.originalname} » : ${report.created} créé(s), ` +
        `${report.skipped} doublon(s) écarté(s), ${report.errors.length} erreur(s)`,
      userId: actorId,
    });

    return report;
  }

  /** Correspondance souple entre les en-têtes du fichier et nos champs. */
  private mapHeaders(headerRow: ExcelJS.Row): Record<string, number> {
    const columns: Record<string, number> = {};

    headerRow.eachCell((cell, index) => {
      const label = normalize(String(cell.value ?? ''));
      if (!label) return;

      for (const [field, aliases] of Object.entries(HEADERS)) {
        if (columns[field] !== undefined) continue;
        if (aliases.some((alias) => label === alias || label.includes(alias))) {
          columns[field] = index;
          return;
        }
      }
    });

    return columns;
  }

  /**
   * Un doublon se reconnaît à l'e-mail ou au téléphone. Le nom seul ne suffit
   * pas : deux homonymes existent, et écarter le second serait une perte.
   */
  private async findDuplicate(email?: string, phone?: string, customerId?: string) {
    if (!email && !phone) return null;

    const or = [
      ...(email ? [{ email }] : []),
      ...(phone ? [{ phone }] : []),
    ];

    if (customerId) {
      return this.prisma.contact.findFirst({ where: { customerId, OR: or } });
    }

    return this.prisma.lead.findFirst({ where: { OR: or } });
  }

  private toStream(buffer: Buffer) {
    const { Readable } = require('stream');
    return Readable.from(buffer);
  }
}
