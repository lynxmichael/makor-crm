import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/** Recherche globale multi-entités (CDC §4.17) : un commercial retrouve
 * un client, un prospect, une opportunité, un devis... depuis une seule
 * barre de recherche, sans connaître à l'avance le type d'objet. */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(query: string, limitPerEntity = 5) {
    if (!query || query.trim().length < 2) {
      return {
        query,
        customers: [],
        leads: [],
        contacts: [],
        deals: [],
        quotes: [],
        contracts: [],
        invoices: [],
        documents: [],
      };
    }

    const q = query.trim();
    const insensitive = { contains: q, mode: 'insensitive' as const };

    const [
      customers,
      leads,
      contacts,
      deals,
      quotes,
      contracts,
      invoices,
      documents,
    ] = await Promise.all([
      this.prisma.customer.findMany({
        where: {
          OR: [
            { companyName: insensitive },
            { email: insensitive },
            { phone: insensitive },
            { code: insensitive },
          ],
        },
        take: limitPerEntity,
      }),

      this.prisma.lead.findMany({
        where: {
          OR: [
            { firstName: insensitive },
            { lastName: insensitive },
            { company: insensitive },
            { email: insensitive },
          ],
        },
        take: limitPerEntity,
      }),

      this.prisma.contact.findMany({
        where: {
          OR: [
            { firstName: insensitive },
            { lastName: insensitive },
            { email: insensitive },
          ],
        },
        include: { customer: true },
        take: limitPerEntity,
      }),

      this.prisma.deal.findMany({
        where: { title: insensitive },
        include: { stage: true, customer: true, lead: true },
        take: limitPerEntity,
      }),

      this.prisma.quote.findMany({
        where: {
          OR: [{ number: insensitive }, { title: insensitive }],
        },
        include: { customer: true },
        take: limitPerEntity,
      }),

      this.prisma.contract.findMany({
        where: {
          OR: [{ number: insensitive }, { title: insensitive }],
        },
        include: { customer: true },
        take: limitPerEntity,
      }),

      this.prisma.invoice.findMany({
        where: { number: insensitive },
        include: { customer: true },
        take: limitPerEntity,
      }),

      this.prisma.document.findMany({
        where: { name: insensitive },
        include: { customer: true },
        take: limitPerEntity,
      }),
    ]);

    return {
      query: q,
      customers,
      leads,
      contacts,
      deals,
      quotes,
      contracts,
      invoices,
      documents,
      total:
        customers.length +
        leads.length +
        contacts.length +
        deals.length +
        quotes.length +
        contracts.length +
        invoices.length +
        documents.length,
    };
  }
}
