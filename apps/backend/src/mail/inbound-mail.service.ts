import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Réception des réponses clients (arbitrage tranché le 13/08/2026 : IMAP).
 *
 * Pourquoi IMAP plutôt qu'un webhook : le webhook suppose un prestataire
 * d'acheminement — Mailgun, Postmark, SendGrid — avec un domaine vérifié et
 * une URL publique joignable. IMAP se branche sur la boîte qui existe déjà,
 * fonctionne derrière n'importe quel pare-feu, et ne coûte rien de plus. Le
 * prix à payer est la latence : on relève toutes les cinq minutes au lieu de
 * recevoir à l'instant.
 *
 * Ce service ne démarre que si `IMAP_HOST` est renseigné : sans configuration,
 * il reste silencieux plutôt que de faire échouer le démarrage.
 */
@Injectable()
export class InboundMailService implements OnModuleDestroy {
  private readonly logger = new Logger(InboundMailService.name);
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  private get enabled(): boolean {
    return Boolean(this.config.get<string>('IMAP_HOST'));
  }

  /**
   * Relève périodique.
   *
   * `running` empêche deux relèves simultanées : une boîte encombrée peut
   * mettre plus de cinq minutes à se vider, et deux passes concurrentes
   * créeraient chaque document en double.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async poll(): Promise<void> {
    if (!this.enabled || this.running) return;

    this.running = true;

    try {
      await this.fetchUnseen();
    } catch (error) {
      this.logger.error(
        `Relève IMAP impossible : ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async fetchUnseen(): Promise<void> {
    // Import différé : la bibliothèque n'est chargée que si la réception est
    // configurée, si bien qu'une installation sans IMAP démarre sans elle.
    const { ImapFlow } = await import('imapflow');
    const { simpleParser } = await import('mailparser');

    const client = new ImapFlow({
      host: this.config.getOrThrow<string>('IMAP_HOST'),
      port: Number(this.config.get<string>('IMAP_PORT') ?? 993),
      secure: this.config.get<string>('IMAP_SECURE') !== 'false',
      auth: {
        user: this.config.getOrThrow<string>('IMAP_USER'),
        pass: this.config.getOrThrow<string>('IMAP_PASSWORD'),
      },
      logger: false,
    });

    await client.connect();

    try {
      const lock = await client.getMailboxLock('INBOX');

      try {
        const unseen = await client.search({ seen: false });
        if (!unseen || unseen.length === 0) return;

        // Plafond par passe : une boîte laissée sans relève pendant des
        // semaines ne doit pas monopoliser le serveur d'un coup.
        for (const uid of unseen.slice(0, 50)) {
          const message = await client.fetchOne(String(uid), { source: true });
          if (!message || !message.source) continue;

          const parsed = await simpleParser(message.source);
          await this.ingest(parsed);

          // Marqué lu seulement après traitement réussi : une erreur laisse
          // le message en attente pour la passe suivante.
          await client.messageFlagsAdd(String(uid), ['\\Seen']);
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
  }

  /**
   * Rattache un message reçu à un client ou prospect, et enregistre ses
   * pièces jointes.
   *
   * L'appariement se fait sur l'adresse d'expédition. Un message venant d'une
   * adresse inconnue est ignoré : créer un prospect à chaque courrier
   * remplirait la base de robots publicitaires et de notifications
   * automatiques.
   */
  private async ingest(mail: {
    from?: { value: { address?: string; name?: string }[] };
    subject?: string;
    text?: string;
    date?: Date;
    attachments?: { filename?: string; content: Buffer; contentType?: string; size?: number }[];
  }): Promise<void> {
    const from = mail.from?.value?.[0]?.address?.toLowerCase();
    if (!from) return;

    const [customer, contact, lead] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { email: { equals: from, mode: 'insensitive' } },
        select: { id: true, companyName: true, assignedToId: true },
      }),
      this.prisma.contact.findFirst({
        where: { email: { equals: from, mode: 'insensitive' } },
        select: { customerId: true, firstName: true, lastName: true },
      }),
      this.prisma.lead.findFirst({
        where: { email: { equals: from, mode: 'insensitive' } },
        select: { id: true, firstName: true, lastName: true, assignedToId: true },
      }),
    ]);

    const customerId = customer?.id ?? contact?.customerId ?? null;

    if (!customerId && !lead) {
      this.logger.debug(`Message de ${from} ignoré : expéditeur inconnu.`);
      return;
    }

    const subject = mail.subject?.trim() || '(sans objet)';
    const attachments = (mail.attachments ?? []).filter((a) => a.filename && a.content?.length);

    // Le corps du message devient une activité : sans cela, un client qui
    // répond sans pièce jointe ne laisserait aucune trace dans le CRM.
    const owner = customer?.assignedToId ?? lead?.assignedToId ?? null;

    if (owner) {
      await this.prisma.activity.create({
        data: {
          type: 'EMAIL',
          status: 'COMPLETED',
          title: `Réponse client — ${subject}`,
          description: [
            `De : ${from}`,
            mail.text?.trim()?.slice(0, 2000) ?? '',
            attachments.length ? `\n${attachments.length} pièce(s) jointe(s)` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          dueDate: mail.date ?? new Date(),
          completedAt: mail.date ?? new Date(),
          assignedToId: owner,
          ...(customerId ? { customerId } : {}),
          ...(lead ? { leadId: lead.id } : {}),
        },
      });
    }

    if (attachments.length === 0) return;

    // Les pièces jointes ne sont rattachées qu'à un client : `Document`
    // n'a pas de lien vers les prospects. Celles d'un prospect sont donc
    // décrites dans l'activité mais pas versées à la GED.
    if (!customerId) return;

    const root = join(process.cwd(), 'uploads');
    if (!existsSync(root)) mkdirSync(root, { recursive: true });

    const uploader = owner ?? (await this.anyAdminId());

    for (const attachment of attachments) {
      const safeExt = extname(attachment.filename ?? '').toLowerCase();
      const fileName = `recu-${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`;

      writeFileSync(join(root, fileName), attachment.content);

      await this.prisma.document.create({
        data: {
          name: `${attachment.filename} — reçu de ${from}`,
          fileName,
          path: `uploads/${fileName}`,
          mimeType: attachment.contentType ?? 'application/octet-stream',
          size: attachment.size ?? attachment.content.length,
          type: 'OTHER',
          customerId,
          uploadedById: uploader,
        },
      });
    }

    this.logger.log(
      `${attachments.length} pièce(s) jointe(s) reçue(s) de ${from} et versée(s) à la GED.`,
    );

    if (owner) {
      // Notification écrite directement : il n'existe pas d'écouteur pour un
      // événement `notification.create`, et émettre sans consommateur ne
      // produirait rien de visible.
      const notification = await this.prisma.notification.create({
        data: {
          userId: owner,
          type: 'INFO',
          title: 'Document reçu d’un client',
          message: `${attachments.length} pièce(s) jointe(s) de ${from} — « ${subject} »`,
        },
      });

      // La passerelle temps réel pousse la notification à l'agent concerné,
      // s'il est connecté.
      this.events.emit('notification.created', notification);
    }
  }

  private async anyAdminId(): Promise<string> {
    const admin = await this.prisma.user.findFirst({
      where: { role: { name: 'SUPER_ADMIN' } },
      select: { id: true },
    });

    return admin!.id;
  }

  onModuleDestroy(): void {
    this.running = false;
  }
}
