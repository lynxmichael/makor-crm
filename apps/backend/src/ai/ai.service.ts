import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiTaskType, CommentEntity } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

import { GenerateDto } from './dto/generate.dto';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Consignes communes à toutes les tâches.
 *
 * La règle centrale du module : le modèle rédige, il ne calcule pas. Les
 * montants lui sont donnés déjà calculés par le backend et il a interdiction
 * d'en produire d'autres. Une erreur de rédaction se relit ; une erreur de
 * montant sur un devis engage l'entreprise.
 */
const SYSTEM_RULES = `Tu rédiges des documents commerciaux pour MAKOR Group Telecom,
opérateur de services de messagerie (SMS Marketing, OTP, API SMS, WhatsApp Business,
Voice, Sender ID) en Afrique de l'Ouest.

Règles absolues :
- N'invente jamais un chiffre. N'additionne, ne recalcule et n'arrondis aucun montant,
  quantité, taux ou date. Les valeurs chiffrées te sont fournies dans le contexte :
  reprends-les telles quelles, à l'identique, ou n'en parle pas.
- Si une information te manque, écris-la entre crochets — par exemple [à préciser] —
  plutôt que de la deviner.
- Écris en français professionnel, en phrases complètes, sans superlatifs commerciaux
  ni formules creuses.
- La devise est le franc CFA (FCFA). Ne convertis dans aucune autre devise.
- Ne produis que le texte demandé, sans préambule ni commentaire sur ton travail.`;

const TASK_PROMPTS: Record<AiTaskType, string> = {
  QUOTE_INTRO:
    "Rédige le paragraphe d'introduction du devis : contexte du besoin client et périmètre de la proposition. 100 à 150 mots.",
  QUOTE_TERMS:
    'Rédige les conditions générales du devis : validité, modalités de paiement, délai de mise en service, engagement de qualité de service. Format en liste de clauses courtes.',
  CONTRACT_BODY:
    "Rédige le corps du contrat : objet, périmètre des prestations, durée, obligations de chaque partie. Structure en articles numérotés.",
  CONTRACT_CLAUSE:
    "Rédige la clause demandée dans l'instruction, dans le style juridique du reste du contrat.",
  EMAIL_DRAFT:
    "Rédige l'e-mail d'accompagnement du document, court et direct, prêt à être envoyé au client.",
  MEETING_SUMMARY:
    'Rédige le compte rendu de rendez-vous à partir des notes fournies : points abordés, décisions, prochaines étapes.',
};

/** Quelles tâches portent sur un devis, lesquelles sur un contrat. */
const TASK_ENTITY: Record<AiTaskType, CommentEntity> = {
  QUOTE_INTRO: CommentEntity.QUOTE,
  QUOTE_TERMS: CommentEntity.QUOTE,
  CONTRACT_BODY: CommentEntity.CONTRACT,
  CONTRACT_CLAUSE: CommentEntity.CONTRACT,
  EMAIL_DRAFT: CommentEntity.QUOTE,
  MEETING_SUMMARY: CommentEntity.DEAL,
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  /** Le frontend interroge ce point pour masquer les boutons plutôt que les faire échouer. */
  status() {
    const enabled = Boolean(this.config.get<string>('ANTHROPIC_API_KEY'));
    return {
      enabled,
      model: this.model(),
      detail: enabled
        ? null
        : 'Génération assistée indisponible : ANTHROPIC_API_KEY n’est pas configurée.',
    };
  }

  async generate(dto: GenerateDto, userId: string) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey) {
      // 503 et non 500 : ce n'est pas un bug, c'est une fonctionnalité non
      // configurée. Le reste de l'application continue de tourner.
      throw new ServiceUnavailableException(
        'Génération assistée indisponible : ANTHROPIC_API_KEY n’est pas configurée sur ce serveur.',
      );
    }

    const entityType = TASK_ENTITY[dto.taskType];
    const context = await this.buildContext(entityType, dto.entityId);

    const userPrompt = [
      TASK_PROMPTS[dto.taskType],
      '',
      '--- Contexte factuel (valeurs calculées par le système, à reprendre telles quelles) ---',
      context,
      ...(dto.instruction
        ? ['', '--- Consigne du commercial ---', dto.instruction]
        : []),
    ].join('\n');

    const { text, inputTokens, outputTokens } = await this.callClaude(apiKey, userPrompt);

    const generation = await this.prisma.aiGeneration.create({
      data: {
        taskType: dto.taskType,
        entityType,
        entityId: dto.entityId,
        instruction: dto.instruction ?? null,
        output: text,
        model: this.model(),
        inputTokens,
        outputTokens,
        requestedById: userId,
      },
    });

    await this.audit.create({
      action: 'CREATE',
      entity: 'AiGeneration',
      entityId: generation.id,
      description: `Génération ${dto.taskType} pour ${entityType} ${dto.entityId}`,
      userId,
    });

    return generation;
  }

  /** Historique des propositions faites sur une entité. */
  history(entityType: CommentEntity, entityId: string) {
    return this.prisma.aiGeneration.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Marque une proposition comme retenue. Le texte n'est pas appliqué ici :
   * c'est au module métier (devis, contrat) d'écrire son propre champ, pour
   * que la validation habituelle s'applique.
   */
  async markAccepted(id: string, accepted: boolean) {
    const generation = await this.prisma.aiGeneration.findUnique({ where: { id } });
    if (!generation) throw new NotFoundException('Génération introuvable.');

    return this.prisma.aiGeneration.update({
      where: { id },
      data: { acceptedAt: accepted ? new Date() : null },
    });
  }

  // -------------------------------------------------------------------------
  // Contexte : lu en base, jamais fourni par le client
  // -------------------------------------------------------------------------

  /**
   * Le contexte est reconstruit côté serveur à chaque appel. Laisser le
   * frontend l'envoyer permettrait de faire rédiger un devis sur des montants
   * arbitraires — c'est exactement ce qu'on veut éviter.
   */
  private async buildContext(entityType: CommentEntity, entityId: string): Promise<string> {
    if (entityType === CommentEntity.QUOTE) {
      const quote = await this.prisma.quote.findUnique({
        where: { id: entityId },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      if (!quote) throw new NotFoundException('Devis introuvable.');

      const lines = quote.items
        .map(
          (item) =>
            `  • ${item.description} — ${item.quantity} × ${this.money(item.unitPrice)} = ${this.money(item.total)}`,
        )
        .join('\n');

      return [
        `Client : ${quote.customer.companyName}`,
        `Secteur : ${quote.customer.sector ?? 'non renseigné'}`,
        `Pays : ${quote.customer.country ?? 'non renseigné'}`,
        `Devis n° ${quote.number} — ${quote.title}`,
        quote.validUntil
          ? `Validité : jusqu'au ${quote.validUntil.toLocaleDateString('fr-FR')}`
          : 'Validité : non renseignée',
        '',
        'Lignes :',
        lines || '  (aucune ligne)',
        '',
        `Sous-total : ${this.money(quote.subtotal)}`,
        `Remise : ${this.money(quote.discount)}`,
        `TVA : ${this.money(quote.tax)}`,
        `Total TTC : ${this.money(quote.total)}`,
      ].join('\n');
    }

    if (entityType === CommentEntity.CONTRACT) {
      const contract = await this.prisma.contract.findUnique({
        where: { id: entityId },
        include: { customer: true, purchaseOrder: true },
      });

      if (!contract) throw new NotFoundException('Contrat introuvable.');

      return [
        `Client : ${contract.customer.companyName}`,
        `Secteur : ${contract.customer.sector ?? 'non renseigné'}`,
        `Contrat n° ${contract.number} — ${contract.title}`,
        `Montant : ${this.money(contract.amount)}`,
        `Début : ${contract.startDate.toLocaleDateString('fr-FR')}`,
        contract.endDate
          ? `Fin : ${contract.endDate.toLocaleDateString('fr-FR')}`
          : 'Fin : durée indéterminée',
        contract.purchaseOrder
          ? `Établi à partir du bon de commande n° ${contract.purchaseOrder.number}`
          : '',
        contract.description ? `Description existante : ${contract.description}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    const deal = await this.prisma.deal.findUnique({
      where: { id: entityId },
      include: { customer: true, stage: true, assignedTo: true },
    });

    if (!deal) throw new NotFoundException('Opportunité introuvable.');

    return [
      `Client : ${deal.customer?.companyName ?? 'non rattaché'}`,
      `Opportunité : ${deal.title}`,
      deal.description ? `Description : ${deal.description}` : '',
      `Montant : ${this.money(deal.amount)}`,
      `Étape : ${deal.stage.name} — probabilité ${deal.probability} %`,
      deal.expectedCloseDate
        ? `Clôture prévue : ${deal.expectedCloseDate.toLocaleDateString('fr-FR')}`
        : '',
      `Commercial : ${deal.assignedTo.firstName} ${deal.assignedTo.lastName}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  // -------------------------------------------------------------------------
  // Appel du modèle
  // -------------------------------------------------------------------------

  /**
   * Appel direct de l'API par `fetch` plutôt que par le SDK : le backend n'a
   * aujourd'hui aucune dépendance Anthropic, et une seule requête POST ne
   * justifie pas d'en ajouter une.
   */
  private async callClaude(apiKey: string, userPrompt: string) {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: this.model(),
        max_tokens: 2000,
        system: SYSTEM_RULES,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(`Anthropic ${response.status} : ${detail.slice(0, 500)}`);

      throw new ServiceUnavailableException(
        response.status === 429
          ? 'Le service de génération est momentanément saturé. Réessayez dans un instant.'
          : 'Le service de génération n’a pas répondu correctement.',
      );
    }

    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const text = (data.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('\n')
      .trim();

    if (!text) {
      throw new ServiceUnavailableException('Le service de génération a renvoyé une réponse vide.');
    }

    return {
      text,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    };
  }

  private model(): string {
    return this.config.get<string>('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-6';
  }

  /** Formatage unique des montants transmis au modèle, en FCFA sans décimales. */
  private money(value: unknown): string {
    const n = Number(value);
    return Number.isFinite(n)
      ? `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`
      : '[montant indisponible]';
  }
}
