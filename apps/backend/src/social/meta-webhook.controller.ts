import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { createHmac, timingSafeEqual } from 'crypto';
import { LeadSource, SocialSource } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/** Charge utile d'un webhook Meta, réduite à ce qu'on exploite. */
interface MetaPayload {
  object?: string;
  entry?: {
    id?: string;
    time?: number;
    changes?: {
      field?: string;
      value?: Record<string, unknown>;
    }[];
  }[];
}

/**
 * Réception directe des événements Meta — Facebook et Instagram
 * (demande du 13/08/2026).
 *
 * Contrairement à la veille par e-mail, ce canal est en temps réel et
 * structuré : un formulaire publicitaire rempli devient un prospect dans le
 * CRM, sans ressaisie.
 *
 * Trois conditions avant que ça fonctionne, et aucune n'est facultative :
 *
 * 1. Une URL publique en HTTPS avec un certificat valide — les certificats
 *    auto-signés sont refusés par Meta.
 * 2. Une application Meta validée par revue, avec vérification d'entreprise.
 * 3. La page abonnée à l'application.
 *
 * Sans `META_APP_SECRET`, l'endpoint refuse tout : mieux vaut ne rien
 * recevoir que d'accepter des requêtes non signées sur une route publique.
 */
@ApiExcludeController()
// Exempté du plafond global de 120 requêtes par minute : une rafale de
// commentaires sur une publication virale le dépasserait, et Meta finit par
// désabonner une application dont l'endpoint rejette ses envois. La signature
// HMAC reste la protection — elle vaut mieux qu'un compteur.
@SkipThrottle()
@Controller('webhooks/meta')
export class MetaWebhookController {
  private readonly logger = new Logger(MetaWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Poignée de main de vérification.
   *
   * Meta appelle cette route à l'enregistrement du webhook et attend que le
   * défi soit renvoyé tel quel, prouvant qu'on contrôle bien l'URL.
   */
  @Get()
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ): string {
    const expected = this.config.get<string>('META_VERIFY_TOKEN');

    if (!expected) {
      throw new ForbiddenException('Webhook Meta non configuré sur ce serveur.');
    }

    if (mode !== 'subscribe' || token !== expected) {
      this.logger.warn('Vérification de webhook refusée : jeton invalide.');
      throw new ForbiddenException('Jeton de vérification invalide.');
    }

    return challenge ?? '';
  }

  /**
   * Réception des événements.
   *
   * Répond 200 immédiatement et traite ensuite : Meta réessaie et finit par
   * désabonner une application dont l'endpoint tarde à répondre. Le travail
   * ne doit donc jamais retarder l'accusé de réception.
   */
  @Post()
  @HttpCode(200)
  receive(
    @Body() payload: MetaPayload,
    @Headers('x-hub-signature-256') signature: string,
    @Req() request: RawBodyRequest<{ rawBody?: Buffer }>,
  ): { received: true } {
    this.assertSignature(request.rawBody, signature);

    void this.process(payload).catch((error) =>
      this.logger.error(
        `Traitement du webhook Meta impossible : ${
          error instanceof Error ? error.message : 'erreur inconnue'
        }`,
      ),
    );

    return { received: true };
  }

  /**
   * Vérifie que la requête vient bien de Meta.
   *
   * Sur une route publique, c'est la seule barrière : sans elle, n'importe
   * qui pourrait injecter de faux prospects dans le CRM en connaissant
   * l'URL. La comparaison est à temps constant pour ne pas laisser deviner
   * la signature octet par octet.
   */
  private assertSignature(rawBody: Buffer | undefined, signature?: string): void {
    const secret = this.config.get<string>('META_APP_SECRET');

    if (!secret) {
      throw new ForbiddenException('Webhook Meta non configuré sur ce serveur.');
    }

    if (!rawBody || !signature?.startsWith('sha256=')) {
      throw new BadRequestException('Signature absente.');
    }

    const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(signature);

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      this.logger.warn('Signature de webhook invalide — requête rejetée.');
      throw new ForbiddenException('Signature invalide.');
    }
  }

  private async process(payload: MetaPayload): Promise<void> {
    const source: SocialSource =
      payload.object === 'instagram' ? 'INSTAGRAM' : 'FACEBOOK';

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field === 'leadgen') {
          await this.handleLead(change.value ?? {}, source);
          continue;
        }

        await this.handleActivity(change, entry, source);
      }
    }
  }

  /**
   * Formulaire publicitaire rempli.
   *
   * Le webhook ne transporte que des identifiants : les réponses du
   * formulaire se récupèrent ensuite par l'API avec un jeton de page. Sans ce
   * jeton, on enregistre tout de même l'événement — perdre le signal serait
   * pire que de le garder incomplet.
   */
  private async handleLead(value: Record<string, unknown>, source: SocialSource): Promise<void> {
    const leadgenId = String(value.leadgen_id ?? '');
    if (!leadgenId) return;

    const token = this.config.get<string>('META_PAGE_ACCESS_TOKEN');

    if (!token) {
      await this.recordUpdate(
        source,
        'Formulaire publicitaire rempli',
        `Contact reçu (${leadgenId}) — jeton de page absent, réponses non récupérées.`,
        `meta:lead:${leadgenId}`,
      );
      return;
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v25.0/${leadgenId}?access_token=${token}`,
      );

      if (!response.ok) throw new Error(`Graph API : ${response.status}`);

      const lead = (await response.json()) as {
        field_data?: { name: string; values: string[] }[];
        created_time?: string;
      };

      const fields = Object.fromEntries(
        (lead.field_data ?? []).map((f) => [f.name.toLowerCase(), f.values?.[0] ?? '']),
      );

      const email = fields.email || fields['adresse_e-mail'] || null;
      const phone = fields.phone_number || fields.telephone || null;

      // Doublon écarté sur l'e-mail ou le téléphone, comme à l'import : la
      // même personne peut remplir deux publicités.
      if (email || phone) {
        const existing = await this.prisma.lead.findFirst({
          where: {
            OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
          },
          select: { id: true },
        });

        if (existing) {
          this.logger.log(`Contact ${leadgenId} déjà connu — ignoré.`);
          return;
        }
      }

      const fullName = (fields.full_name || fields.nom_complet || '').trim();
      const [firstName, ...rest] = fullName.split(/\s+/);

      const assignedToId = await this.nextCommercial();

      const created = await this.prisma.lead.create({
        data: {
          assignedToId,
          firstName: fields.first_name || firstName || '—',
          lastName: fields.last_name || rest.join(' ') || '—',
          email,
          phone,
          company: fields.company_name || null,
          city: fields.city || null,
          source:
            source === 'INSTAGRAM' ? LeadSource.INSTAGRAM : LeadSource.FACEBOOK,
          notes: `Reçu depuis une publicité ${source === 'INSTAGRAM' ? 'Instagram' : 'Facebook'}.`,
        },
      });

      // Sans affectation, le prospect resterait invisible : un commercial ne
      // voit que ceux dont il a la charge. Un contact publicitaire qui
      // n'apparaît chez personne est un contact perdu.
      if (assignedToId) {
        const notification = await this.prisma.notification.create({
          data: {
            userId: assignedToId,
            type: 'INFO',
            title: 'Nouveau contact publicitaire',
            message:
              `${created.firstName} ${created.lastName}` +
              `${created.phone ? ` — ${created.phone}` : ''} vous est attribué.`,
          },
        });

        // Diffusion immédiate : un contact publicitaire se rappelle dans
        // l'heure, pas le lendemain.
        this.events.emit('notification.created', notification);
      }

      this.logger.log(`Prospect créé depuis le formulaire ${leadgenId}.`);
    } catch (error) {
      // L'échec de récupération ne doit pas effacer le signal : on garde une
      // trace exploitable manuellement.
      await this.recordUpdate(
        source,
        'Formulaire publicitaire rempli',
        `Contact ${leadgenId} — récupération impossible : ${
          error instanceof Error ? error.message : 'erreur inconnue'
        }`,
        `meta:lead:${leadgenId}`,
      );
    }
  }


  /**
   * Commercial suivant, à la ronde.
   *
   * Celui qui a le moins de prospects reçoit le suivant. Une attribution au
   * hasard concentrerait les contacts sur quelques-uns, et les laisser sans
   * chargé de compte les rendrait invisibles — le cloisonnement fait qu'un
   * commercial ne voit que les siens.
   *
   * `null` si aucun commercial actif : le prospect est alors créé sans
   * affectation, visible des seuls profils de pilotage, qui pourront le
   * distribuer.
   */
  private async nextCommercial(): Promise<string | null> {
    const commercials = await this.prisma.user.findMany({
      where: { isActive: true, role: { name: 'COMMERCIAL' } },
      select: { id: true, _count: { select: { assignedLeads: true } } },
    });

    if (commercials.length === 0) return null;

    return commercials.sort((a, b) => a._count.assignedLeads - b._count.assignedLeads)[0].id;
  }

  /** Commentaire, mention ou publication : versé au fil de veille. */
  private async handleActivity(
    change: { field?: string; value?: Record<string, unknown> },
    entry: { id?: string; time?: number },
    source: SocialSource,
  ): Promise<void> {
    const value = change.value ?? {};

    const author = String(value.from ? (value.from as { name?: string }).name ?? '' : '');
    const message = String(value.message ?? value.text ?? '');

    const title =
      change.field === 'feed' && value.item === 'comment'
        ? `Nouveau commentaire${author ? ` de ${author}` : ''}`
        : change.field === 'mention'
          ? `Mention${author ? ` par ${author}` : ''}`
          : `Activité ${change.field ?? 'inconnue'}`;

    await this.recordUpdate(
      source,
      title,
      message.slice(0, 400) || null,
      `meta:${entry.id}:${change.field}:${value.comment_id ?? value.post_id ?? entry.time}`,
      value.permalink_url ? String(value.permalink_url) : null,
    );
  }

  private async recordUpdate(
    source: SocialSource,
    title: string,
    summary: string | null,
    messageKey: string,
    link: string | null = null,
  ): Promise<void> {
    const existing = await this.prisma.socialUpdate.findUnique({
      where: { messageKey },
      select: { id: true },
    });

    // Meta réémet un événement tant qu'il n'a pas reçu d'accusé : sans cette
    // vérification, une lenteur passagère créerait des doublons.
    if (existing) return;

    await this.prisma.socialUpdate.create({
      data: {
        source,
        title,
        summary,
        link,
        fromAddress: 'webhook',
        receivedAt: new Date(),
        messageKey,
      },
    });
  }
}
