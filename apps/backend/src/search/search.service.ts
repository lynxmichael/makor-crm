import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/** Recherche globale multi-entités (CDC §4.17) : un commercial retrouve
 * un client, un prospect, une opportunité, un devis... depuis une seule
 * barre de recherche, sans connaître à l'avance le type d'objet. */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recherche globale.
   *
   * `scopeToUserId` restreint les résultats au portefeuille de l'appelant.
   * Sans lui, la recherche contournait tout le cloisonnement posé sur les
   * modules : il suffisait de taper le nom d'une entreprise pour voir
   * apparaître le contrat ou la facture d'un collègue.
   *
   * Les documents et contacts passent par le client rattaché ; un document
   * sans client n'apparaît pas dans une recherche restreinte, faute de
   * pouvoir établir à qui il appartient.
   */
  async globalSearch(query: string, limitPerEntity = 5, scopeToUserId?: string) {
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

    // Périmètre : direct quand l'entité porte l'affectation, indirect quand
    // elle passe par le client.
    const mine = scopeToUserId ? { assignedToId: scopeToUserId } : {};
    const viaCustomer = scopeToUserId
      ? { customer: { assignedToId: scopeToUserId } }
      : {};

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
          ...mine,
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
          ...mine,
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
          ...viaCustomer,
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
        where: { ...mine, title: insensitive },
        include: { stage: true, customer: true, lead: true },
        take: limitPerEntity,
      }),

      this.prisma.quote.findMany({
        where: {
          ...viaCustomer,
          OR: [{ number: insensitive }, { title: insensitive }],
        },
        include: { customer: true },
        take: limitPerEntity,
      }),

      this.prisma.contract.findMany({
        where: {
          ...viaCustomer,
          OR: [{ number: insensitive }, { title: insensitive }],
        },
        include: { customer: true },
        take: limitPerEntity,
      }),

      this.prisma.invoice.findMany({
        where: { ...viaCustomer, number: insensitive },
        include: { customer: true },
        take: limitPerEntity,
      }),

      this.prisma.document.findMany({
        where: { ...viaCustomer, name: insensitive },
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
