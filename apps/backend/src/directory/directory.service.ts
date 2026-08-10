import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadSource } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateDirectoryEntryDto, DirectoryEntryKind } from './dto/create-entry.dto';

/** Une entrée d'annuaire, quelle que soit son origine. */
export interface DirectoryEntry {
  id: string;
  kind: 'CONTACT' | 'LEAD';
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  /** Raison sociale pour un contact, entreprise déclarée pour un prospect. */
  company: string | null;
  country: string | null;
  city: string | null;
  sector: string | null;
  /** Renseigné pour un contact : la fiche client dont il dépend. */
  customerId: string | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  /** Statut commercial — prospects uniquement. */
  status: string | null;
  createdAt: Date;
}

const OWNER_SELECT = { id: true, firstName: true, lastName: true } as const;

@Injectable()
export class DirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Annuaire unifié (demande du 05/08/2026).
   *
   * Contacts clients et prospects vivent dans deux tables distinctes — l'un
   * dépend d'une fiche client, l'autre existe seul. Les fusionner en base
   * aurait cassé cette différence, qui est réelle : un contact disparaît avec
   * son client, un prospect non.
   *
   * On les rassemble donc à la lecture, dans une vue commune. Le tri et la
   * pagination se font en mémoire après fusion : deux requêtes paginées
   * séparément ne donneraient pas une page cohérente une fois mélangées.
   */
  async findAll(params: {
    search?: string;
    country?: string;
    kind?: 'CONTACT' | 'LEAD';
    page?: number;
    limit?: number;
    /** Restreint au portefeuille d'un commercial, quand la règle l'exige. */
    scopeToUserId?: string;
  }) {
    const { search, country, kind, scopeToUserId } = params;
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit) || 25));

    const like = search
      ? { contains: search, mode: 'insensitive' as const }
      : undefined;

    const wantContacts = kind !== 'LEAD';
    const wantLeads = kind !== 'CONTACT';

    const [contacts, leads] = await Promise.all([
      wantContacts
        ? this.prisma.contact.findMany({
            where: {
              ...(scopeToUserId ? { customer: { assignedToId: scopeToUserId } } : {}),
              // Le pays d'un contact est celui de son client : il n'en porte
              // pas en propre.
              ...(country ? { customer: { country } } : {}),
              ...(like
                ? {
                    OR: [
                      { firstName: like },
                      { lastName: like },
                      { email: like },
                      { phone: like },
                      { customer: { companyName: like } },
                    ],
                  }
                : {}),
            },
            include: {
              customer: {
                select: { id: true, companyName: true, country: true, city: true, sector: true },
              },
              assignedTo: { select: OWNER_SELECT },
            },
            take: 500,
          })
        : Promise.resolve([]),

      wantLeads
        ? this.prisma.lead.findMany({
            where: {
              ...(scopeToUserId ? { assignedToId: scopeToUserId } : {}),
              ...(country ? { country } : {}),
              ...(like
                ? {
                    OR: [
                      { firstName: like },
                      { lastName: like },
                      { email: like },
                      { phone: like },
                      { company: like },
                    ],
                  }
                : {}),
            },
            include: { assignedTo: { select: OWNER_SELECT } },
            take: 500,
          })
        : Promise.resolve([]),
    ]);

    const entries: DirectoryEntry[] = [
      ...contacts.map((c) => ({
        id: c.id,
        kind: 'CONTACT' as const,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        jobTitle: c.jobTitle,
        company: c.customer.companyName,
        country: c.customer.country,
        city: c.customer.city,
        sector: c.customer.sector,
        customerId: c.customer.id,
        assignedTo: c.assignedTo,
        status: null,
        createdAt: c.createdAt,
      })),

      ...leads.map((l) => ({
        id: l.id,
        kind: 'LEAD' as const,
        firstName: l.firstName,
        lastName: l.lastName,
        email: l.email,
        phone: l.phone,
        jobTitle: l.jobTitle,
        company: l.company,
        country: l.country,
        city: l.city,
        sector: l.sector,
        customerId: null,
        assignedTo: l.assignedTo,
        status: l.status,
        createdAt: l.createdAt,
      })),
    ];

    entries.sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr'),
    );

    return {
      data: entries.slice((page - 1) * limit, page * limit),
      total: entries.length,
      page,
      limit,
      totalPages: Math.ceil(entries.length / limit) || 1,
    };
  }

  /**
   * Répartition par pays, pour le sélecteur de filtre.
   *
   * Construite depuis les données réelles plutôt que depuis le référentiel
   * Paramètres : un pays configuré mais sans aucun contact n'a pas à
   * encombrer la liste.
   */
  async countries(scopeToUserId?: string) {
    const [customerRows, leadRows] = await Promise.all([
      this.prisma.customer.groupBy({
        by: ['country'],
        where: {
          country: { not: null },
          ...(scopeToUserId ? { assignedToId: scopeToUserId } : {}),
        },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['country'],
        where: {
          country: { not: null },
          ...(scopeToUserId ? { assignedToId: scopeToUserId } : {}),
        },
        _count: { _all: true },
      }),
    ]);

    const tally = new Map<string, number>();
    for (const row of [...customerRows, ...leadRows]) {
      if (!row.country) continue;
      tally.set(row.country, (tally.get(row.country) ?? 0) + row._count._all);
    }

    return [...tally.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Création d'une entrée.
   *
   * Le doublon est refusé sur l'e-mail ou le téléphone, comme à l'import :
   * saisir deux fois le même interlocuteur produit deux fiches divergentes,
   * dont l'une finit par être mise à jour et pas l'autre.
   */
  async create(dto: CreateDirectoryEntryDto, assignedToId?: string) {
    if (dto.email || dto.phone) {
      const or = [
        ...(dto.email ? [{ email: dto.email }] : []),
        ...(dto.phone ? [{ phone: dto.phone }] : []),
      ];

      const [contact, lead] = await Promise.all([
        this.prisma.contact.findFirst({ where: { OR: or }, select: { id: true } }),
        this.prisma.lead.findFirst({ where: { OR: or }, select: { id: true } }),
      ]);

      if (contact || lead) {
        throw new ConflictException(
          'Un interlocuteur avec cet e-mail ou ce numéro figure déjà dans l’annuaire.',
        );
      }
    }

    if (dto.kind === DirectoryEntryKind.CONTACT) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
        select: { id: true },
      });

      if (!customer) throw new NotFoundException('Client introuvable.');

      return this.prisma.contact.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          jobTitle: dto.jobTitle ?? null,
          customerId: dto.customerId!,
          assignedToId: assignedToId ?? null,
        },
      });
    }

    return this.prisma.lead.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        jobTitle: dto.jobTitle ?? null,
        company: dto.company ?? null,
        country: dto.country ?? null,
        city: dto.city ?? null,
        sector: dto.sector ?? null,
        source: LeadSource.OTHER,
        assignedToId: assignedToId ?? null,
      },
    });
  }

  /**
   * Suppression d'une entrée.
   *
   * Un prospect engagé dans une affaire n'est pas supprimé : ses opportunités
   * et ses rendez-vous y renvoient, et les effacer ferait disparaître de
   * l'historique commercial sans que personne ne le demande.
   */
  async remove(kind: 'CONTACT' | 'LEAD', id: string) {
    if (kind === 'CONTACT') {
      const contact = await this.prisma.contact.findUnique({ where: { id } });
      if (!contact) throw new NotFoundException('Contact introuvable.');

      await this.prisma.contact.delete({ where: { id } });
      return { id, kind };
    }

    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { _count: { select: { deals: true, activities: true } } },
    });

    if (!lead) throw new NotFoundException('Prospect introuvable.');

    if (lead._count.deals > 0 || lead._count.activities > 0) {
      throw new BadRequestException(
        `Ce prospect est rattaché à ${lead._count.deals} opportunité(s) et ` +
          `${lead._count.activities} activité(s). Clôturez-les avant de le supprimer.`,
      );
    }

    await this.prisma.lead.delete({ where: { id } });
    return { id, kind };
  }
}
