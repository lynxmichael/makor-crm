import { api } from "@/services/api";

/**
 * Formes renvoyées par `src/deals/deals.service.ts` côté backend.
 * Transcrites depuis le service, pas devinées.
 */

/**
 * Étapes de référence du CDC §4.6 — enum `CanonicalStage` du schéma Prisma (D24).
 *
 * Depuis D24, les colonnes du Kanban portent un libellé libre, administrable
 * depuis l'écran. `canonicalStage` est ce à quoi chacune se rattache : c'est
 * lui qui garde le reporting comparable quand un libellé change, et c'est donc
 * lui qu'on affiche dès que le nom d'une colonne ne dit plus de quelle étape
 * du cahier des charges il s'agit.
 *
 * `PERDU` s'ajoute aux six étapes du CDC : une affaire perdue doit rester
 * traçable et ne correspond à aucune d'entre elles.
 */
export const CANONICAL_STAGES = [
  "PROSPECT",
  "RDV",
  "PROPOSITION",
  "BON_DE_COMMANDE",
  "CONTRAT",
  "VENTE",
  "PERDU",
] as const;

export type CanonicalStage = (typeof CANONICAL_STAGES)[number];

export const CANONICAL_STAGE_LABELS: Record<CanonicalStage, string> = {
  PROSPECT: "Prospect",
  RDV: "Rendez-vous",
  PROPOSITION: "Proposition",
  BON_DE_COMMANDE: "Bon de commande",
  CONTRAT: "Contrat",
  VENTE: "Vente",
  PERDU: "Perdu",
};

export interface BoardStage {
  id: string;
  name: string;
  order: number;
  color: string | null;
  canonicalStage: CanonicalStage;
  isClosedWon: boolean;
  isClosedLost: boolean;
  /** D5 — l'étape exige un bon de commande signé pour être atteinte. */
  requiresSignedOrder: boolean;
}

export interface BoardDealOwner {
  id: string;
  firstName: string;
  lastName: string;
}

export interface BoardDealCustomer {
  id: string;
  companyName: string;
}

export interface BoardDealLead {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
}

export interface BoardDeal {
  id: string;
  title: string;
  description: string | null;
  /**
   * `Decimal` côté Prisma, sérialisé en chaîne par `JSON.stringify`. Ne jamais
   * l'additionner directement — passer par `dealAmount`.
   */
  amount: string | number;
  probability: number;
  expectedCloseDate: string | null;
  stageId: string;
  assignedTo: BoardDealOwner;
  customer: BoardDealCustomer | null;
  lead: BoardDealLead | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardColumn {
  stage: BoardStage;
  deals: BoardDeal[];
  totalValue: number;
}

/** Clé unique du tableau, partagée par la lecture et les mises à jour optimistes. */
export const BOARD_QUERY_KEY = ["pipeline", "board"] as const;

export function dealAmount(deal: BoardDeal): number {
  return Number(deal.amount);
}

/**
 * Compte rattaché à l'opportunité : le client, à défaut le prospect.
 *
 * Une opportunité peut n'avoir ni l'un ni l'autre — `customerId` et `leadId`
 * sont tous deux facultatifs en base.
 */
export function dealAccountName(deal: BoardDeal): string | null {
  if (deal.customer) return deal.customer.companyName;

  if (deal.lead) {
    return deal.lead.company ?? `${deal.lead.firstName} ${deal.lead.lastName}`;
  }

  return null;
}

export function ownerName(owner: BoardDealOwner): string {
  return `${owner.firstName} ${owner.lastName}`;
}

/** Les étapes archivées sont déjà exclues par le backend. */
export async function fetchBoard(): Promise<BoardColumn[]> {
  const { data } = await api.get<BoardColumn[]>("/deals/board");
  return data;
}

export interface MoveDealStageInput {
  dealId: string;
  stageId: string;
  note?: string;
}

/**
 * Le backend refuse la transition avec un 400 et sa raison en français quand
 * l'étape visée exige un bon de commande signé (D5) ou qu'elle a été archivée.
 * L'appelant doit afficher ce message, pas l'avaler.
 */
export async function moveDealStage({
  dealId,
  stageId,
  note,
}: MoveDealStageInput): Promise<BoardDeal> {
  const { data } = await api.patch<BoardDeal>(`/deals/${dealId}/move-stage`, {
    stageId,
    note,
  });
  return data;
}

export interface CreateDealInput {
  title: string;
  amount: number;
  probability?: number;
  expectedCloseDate?: string;
  /** Omis, le backend place l'opportunité sur la première étape configurée. */
  stageId?: string;
  assignedToId: string;
}

export async function createDeal(input: CreateDealInput): Promise<BoardDeal> {
  const { data } = await api.post<BoardDeal>("/deals", input);
  return data;
}
