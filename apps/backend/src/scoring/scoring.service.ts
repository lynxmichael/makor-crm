import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/** Contribution d'un critère au score, conservée pour l'affichage. */
export interface ScoreFactor {
  label: string;
  /** Points obtenus sur ce critère. */
  points: number;
  /** Points maximum atteignables. */
  max: number;
  detail: string;
}

export interface ScoreResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  factors: ScoreFactor[];
}

/**
 * Scoring commercial (CDC §5 — V2).
 *
 * Volontairement déterministe et explicable : chaque point vient d'un
 * critère observable, et la réponse porte le détail du calcul. Un modèle
 * statistique donnerait peut-être un meilleur classement, mais un commercial
 * à qui l'on annonce que son prospect vaut 34/100 doit pouvoir savoir
 * pourquoi — et son responsable doit pouvoir contester la règle. Une note
 * qu'on ne peut pas discuter n'est pas utilisée, elle est ignorée.
 *
 * Ce n'est donc pas de la prédiction : c'est une grille de priorisation,
 * qui répond à « lequel rappeler en premier », pas à « celui-ci signera ».
 */
@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Prospects
  // -------------------------------------------------------------------------

  /**
   * Qualité d'un prospect : à quel point le dossier est exploitable, et à
   * quel point la relation est vivante.
   */
  async scoreLead(leadId: string): Promise<ScoreResult> {
    const lead = await this.prisma.lead.findUniqueOrThrow({
      where: { id: leadId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 1 },
        deals: { select: { id: true } },
      },
    });

    const factors: ScoreFactor[] = [];

    // 1. Complétude du dossier (25) — un prospect sans coordonnées ne se
    //    travaille pas, quel que soit son potentiel supposé.
    const fields = [lead.email, lead.phone, lead.company, lead.jobTitle, lead.sector];
    const filled = fields.filter(Boolean).length;
    factors.push({
      label: 'Complétude du dossier',
      points: Math.round((filled / fields.length) * 25),
      max: 25,
      detail: `${filled} champ(s) clés sur ${fields.length} renseignés`,
    });

    // 2. Interlocuteur décisionnaire (15).
    factors.push({
      label: 'Décideur identifié',
      points: lead.decisionMaker ? 15 : 0,
      max: 15,
      detail: lead.decisionMaker ? `Interlocuteur : ${lead.decisionMaker}` : 'Non identifié',
    });

    // 3. Origine (15) — les canaux entrants convertissent mieux que la
    //    prospection froide, à effort commercial égal.
    const sourceWeights: Record<string, number> = {
      REFERRAL: 15,
      EVENT: 13,
      WEBSITE: 12,
      LINKEDIN: 10,
      WHATSAPP: 8,
      EMAIL: 8,
      PHONE: 6,
      FACEBOOK: 5,
      INSTAGRAM: 5,
      OTHER: 3,
    };
    factors.push({
      label: 'Origine du contact',
      points: sourceWeights[lead.source] ?? 3,
      max: 15,
      detail: `Canal : ${lead.source}`,
    });

    // 4. Avancement dans le cycle (25).
    const statusWeights: Record<string, number> = {
      NEW: 5,
      CONTACTED: 10,
      QUALIFIED: 18,
      PROPOSAL_SENT: 22,
      NEGOTIATION: 25,
      WON: 25,
      LOST: 0,
    };
    factors.push({
      label: 'Avancement',
      points: statusWeights[lead.status] ?? 0,
      max: 25,
      detail: `Statut : ${lead.status}`,
    });

    // 5. Fraîcheur de la relation (20) — un dossier laissé sans contact
    //    depuis deux mois vaut moins qu'un dossier suivi, même mieux rempli.
    const lastTouch = lead.activities[0]?.createdAt ?? lead.updatedAt;
    const daysSince = Math.floor((Date.now() - lastTouch.getTime()) / 86_400_000);
    const freshness = daysSince <= 7 ? 20 : daysSince <= 30 ? 12 : daysSince <= 60 ? 6 : 0;
    factors.push({
      label: 'Fraîcheur du suivi',
      points: freshness,
      max: 20,
      detail:
        daysSince === 0 ? "Contact aujourd'hui" : `Dernier contact il y a ${daysSince} jour(s)`,
    });

    return this.assemble(factors);
  }

  // -------------------------------------------------------------------------
  // Opportunités
  // -------------------------------------------------------------------------

  /**
   * Santé d'une opportunité. Les repères — montant moyen, durée de cycle —
   * sont calculés sur les affaires réellement gagnées plutôt que fixés en
   * dur : une grille figée devient fausse dès que l'activité change.
   */
  async scoreDeal(dealId: string): Promise<ScoreResult> {
    const deal = await this.prisma.deal.findUniqueOrThrow({
      where: { id: dealId },
      include: {
        stage: true,
        activities: { orderBy: { createdAt: 'desc' }, take: 1 },
        quotes: { select: { id: true, status: true } },
      },
    });

    const [wonStats, stages] = await Promise.all([
      this.prisma.deal.aggregate({
        where: { stage: { name: { in: ['Vente', 'Gagné', 'WON'] } } },
        _avg: { amount: true },
      }),
      this.prisma.pipelineStage.findMany({ orderBy: { order: 'asc' } }),
    ]);

    const factors: ScoreFactor[] = [];

    // 1. Progression dans le pipeline (30).
    const position = stages.findIndex((s) => s.id === deal.stageId);
    const progression = stages.length > 1 ? position / (stages.length - 1) : 0;
    factors.push({
      label: 'Progression',
      points: Math.round(progression * 30),
      max: 30,
      detail: `Étape ${position + 1} sur ${stages.length} — ${deal.stage.name}`,
    });

    // 2. Montant rapporté à la moyenne des affaires gagnées (20).
    const average = Number(wonStats._avg.amount ?? 0);
    const amount = Number(deal.amount);
    const ratio = average > 0 ? amount / average : 1;
    factors.push({
      label: 'Montant',
      points: Math.round(Math.min(ratio, 2) * 10),
      max: 20,
      detail:
        average > 0
          ? `${Math.round(ratio * 100)} % du montant moyen des affaires gagnées`
          : 'Pas encore de référence historique',
    });

    // 3. Probabilité renseignée par le commercial (15).
    factors.push({
      label: 'Probabilité annoncée',
      points: Math.round((deal.probability / 100) * 15),
      max: 15,
      detail: `${deal.probability} % selon le commercial`,
    });

    // 4. Existence d'une proposition chiffrée (15) — un devis envoyé marque
    //    un engagement réel, bien plus qu'une intention déclarée.
    const hasAcceptedQuote = deal.quotes.some((q) => q.status === 'ACCEPTED');
    const hasSentQuote = deal.quotes.some((q) => q.status === 'SENT');
    factors.push({
      label: 'Proposition chiffrée',
      points: hasAcceptedQuote ? 15 : hasSentQuote ? 10 : deal.quotes.length ? 5 : 0,
      max: 15,
      detail: hasAcceptedQuote
        ? 'Devis accepté'
        : hasSentQuote
          ? 'Devis envoyé, en attente'
          : deal.quotes.length
            ? 'Devis à l’état de brouillon'
            : 'Aucun devis',
    });

    // 5. Activité récente (20) — une affaire sans mouvement depuis un mois
    //    dort, quelle que soit son étape affichée.
    const lastTouch = deal.activities[0]?.createdAt ?? deal.updatedAt;
    const daysSince = Math.floor((Date.now() - lastTouch.getTime()) / 86_400_000);
    factors.push({
      label: 'Activité récente',
      points: daysSince <= 7 ? 20 : daysSince <= 21 ? 12 : daysSince <= 45 ? 5 : 0,
      max: 20,
      detail: `Dernier mouvement il y a ${daysSince} jour(s)`,
    });

    // Une date de clôture dépassée est un signal fort : l'affaire est soit à
    // relancer, soit à sortir du pipeline. On le signale sans retirer de
    // points, la pénalité serait une double peine avec la fraîcheur.
    if (deal.expectedCloseDate && deal.expectedCloseDate < new Date()) {
      factors.push({
        label: 'Échéance dépassée',
        points: 0,
        max: 0,
        detail: `Clôture prévue le ${deal.expectedCloseDate.toLocaleDateString('fr-FR')} — à revoir`,
      });
    }

    return this.assemble(factors);
  }

  /** Classement des prospects à traiter en priorité. */
  async rankLeads(assignedToId?: string, limit = 20) {
    const leads = await this.prisma.lead.findMany({
      where: {
        status: { notIn: ['WON', 'LOST'] },
        ...(assignedToId ? { assignedToId } : {}),
      },
      select: { id: true, firstName: true, lastName: true, company: true, status: true },
      take: 200,
    });

    const scored = await Promise.all(
      leads.map(async (lead) => ({ ...lead, ...(await this.scoreLead(lead.id)) })),
    );

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private assemble(factors: ScoreFactor[]): ScoreResult {
    const score = Math.min(
      100,
      factors.reduce((sum, factor) => sum + factor.points, 0),
    );

    return {
      score,
      grade: score >= 75 ? 'A' : score >= 50 ? 'B' : score >= 25 ? 'C' : 'D',
      factors,
    };
  }
}
