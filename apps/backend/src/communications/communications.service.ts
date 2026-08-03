import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export type TimelineKind =
  | 'ACTIVITY'
  | 'CAMPAIGN'
  | 'QUOTE'
  | 'PURCHASE_ORDER'
  | 'CONTRACT'
  | 'INVOICE'
  | 'PAYMENT'
  | 'COMMENT'
  | 'SIGNATURE'
  | 'DOCUMENT';

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  at: Date;
  title: string;
  detail?: string;
  /** Qui a agi côté MAKOR, quand l'information existe. */
  actor?: string;
  /** Statut de la pièce, pour colorer l'entrée. */
  status?: string;
  amount?: number;
}

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fil unifié d'un client (CDC §5 — V2).
   *
   * Rien n'est dupliqué : le fil agrège ce que les modules produisent déjà.
   * Recopier ces événements dans une table dédiée aurait créé une seconde
   * vérité à maintenir en cohérence — et la première divergence serait
   * passée inaperçue.
   *
   * Ce qui n'y figure pas encore : les e-mails entrants. Le backend sait
   * envoyer, il ne sait pas recevoir — il manque une brique
   * d'infrastructure (webhook chez un routeur d'e-mails, ou relève IMAP)
   * qui reste à arbitrer. Les réponses des clients n'apparaissent donc pas
   * ici, et le fil ne doit pas être présenté comme exhaustif tant que ce
   * point n'est pas tranché.
   */
  async customerTimeline(customerId: string, limit = 100): Promise<TimelineEntry[]> {
    // Les demandes de signature ne portent pas de `customerId` : elles se
    // rattachent à une pièce (devis, BC, contrat). Les faire remonter ici
    // supposerait de résoudre chaque pièce puis son client — coûteux pour un
    // apport faible, le statut de signature étant déjà visible sur la pièce.
    const [activities, campaigns, quotes, orders, contracts, invoices, payments, comments, documents] =
      await Promise.all([
        this.prisma.activity.findMany({
          where: { customerId },
          include: { assignedTo: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        this.prisma.campaign.findMany({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        this.prisma.quote.findMany({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        this.prisma.purchaseOrder.findMany({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        this.prisma.contract.findMany({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        this.prisma.invoice.findMany({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        this.prisma.payment.findMany({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        this.prisma.comment.findMany({
          where: { entityType: 'CUSTOMER', entityId: customerId },
          include: { author: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        this.prisma.document.findMany({
          where: { customerId },
          include: { uploadedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
      ]);

    const name = (person?: { firstName: string; lastName: string } | null) =>
      person ? `${person.firstName} ${person.lastName}` : undefined;

    const entries: TimelineEntry[] = [
      ...activities.map((a) => ({
        id: a.id,
        kind: 'ACTIVITY' as const,
        at: a.dueDate ?? a.createdAt,
        title: a.title,
        detail: a.description ?? undefined,
        actor: name(a.assignedTo),
        status: a.status,
      })),

      ...campaigns.map((c) => ({
        id: c.id,
        kind: 'CAMPAIGN' as const,
        at: c.startedAt ?? c.createdAt,
        title: `Campagne ${c.type} — ${c.name}`,
        detail: c.message.slice(0, 120),
        status: c.status,
      })),

      ...quotes.map((q) => ({
        id: q.id,
        kind: 'QUOTE' as const,
        at: q.sentAt ?? q.createdAt,
        title: `Devis ${q.number} — ${q.title}`,
        status: q.status,
        amount: Number(q.total),
      })),

      ...orders.map((o) => ({
        id: o.id,
        kind: 'PURCHASE_ORDER' as const,
        at: o.signedAt ?? o.createdAt,
        title: `Bon de commande ${o.number}`,
        status: o.status,
        amount: Number(o.amount),
      })),

      ...contracts.map((c) => ({
        id: c.id,
        kind: 'CONTRACT' as const,
        at: c.startDate ?? c.createdAt,
        title: `Contrat ${c.number} — ${c.title}`,
        status: c.status,
        amount: Number(c.amount),
      })),

      ...invoices.map((i) => ({
        id: i.id,
        kind: 'INVOICE' as const,
        at: i.createdAt,
        title: `Facture ${i.number}`,
        status: i.status,
        amount: Number(i.total),
      })),

      ...payments.map((p) => ({
        id: p.id,
        kind: 'PAYMENT' as const,
        at: p.paidAt ?? p.createdAt,
        title: `Encaissement ${p.method}`,
        detail: p.reference ?? undefined,
        status: p.status,
        amount: Number(p.amount),
      })),

      ...comments.map((c) => ({
        id: c.id,
        kind: 'COMMENT' as const,
        at: c.createdAt,
        title: 'Commentaire interne',
        detail: c.body.slice(0, 160),
        actor: name(c.author),
      })),

      ...documents.map((d) => ({
        id: d.id,
        kind: 'DOCUMENT' as const,
        at: d.createdAt,
        title: `Document — ${d.name}`,
        detail: d.type,
        actor: name(d.uploadedBy),
      })),
    ];

    return entries.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
  }
}
