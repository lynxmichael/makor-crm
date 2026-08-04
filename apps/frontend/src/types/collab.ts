import type { UserSummary } from "./api";

// ---------------------------------------------------------------------------
// Commentaires
// ---------------------------------------------------------------------------

/** Miroir de l'enum Prisma `CommentEntity`. */
export type CommentEntityType =
  | "DASHBOARD"
  | "CUSTOMER"
  | "LEAD"
  | "DEAL"
  | "QUOTE"
  | "PURCHASE_ORDER"
  | "CONTRACT"
  | "INVOICE"
  | "CAMPAIGN";

export interface Comment {
  id: string;
  body: string;
  entityType: CommentEntityType;
  entityId: string | null;
  parentId: string | null;
  mentionedUserIds: string[];
  authorId: string;
  author: UserSummary & { jobTitle?: string | null };
  /** Renseigné dès la première modification. */
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Présent uniquement sur les commentaires racine. */
  replies?: Comment[];
}

// ---------------------------------------------------------------------------
// Messagerie interne
// ---------------------------------------------------------------------------

export interface Message {
  id: string;
  subject: string | null;
  body: string;
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  senderId: string;
  sender?: UserSummary;
  recipientId: string;
  recipient?: UserSummary;
  readAt: string | null;
  createdAt: string;
}

export interface Conversation {
  partner: UserSummary & { jobTitle?: string | null };
  lastMessage: Message;
  unreadCount: number;
}

export interface Thread {
  partner: UserSummary & { jobTitle?: string | null };
  messages: Message[];
}

// ---------------------------------------------------------------------------
// Génération assistée
// ---------------------------------------------------------------------------

export type AiTaskType =
  | "QUOTE_INTRO"
  | "QUOTE_TERMS"
  | "CONTRACT_BODY"
  | "CONTRACT_CLAUSE"
  | "EMAIL_DRAFT"
  | "MEETING_SUMMARY"
  | "CAMPAIGN_MESSAGE"
  | "CAMPAIGN_VARIANTS";

/** Réponse de `GET /ai/status` — sert à masquer les actions plutôt qu'à les faire échouer. */
export interface AiStatus {
  enabled: boolean;
  model: string;
  detail: string | null;
}

export interface AiGeneration {
  id: string;
  taskType: AiTaskType;
  entityType: CommentEntityType | null;
  entityId: string | null;
  instruction: string | null;
  output: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  acceptedAt: string | null;
  requestedById: string;
  createdAt: string;
}

export const AI_TASK_LABELS: Record<AiTaskType, string> = {
  QUOTE_INTRO: "Introduction du devis",
  QUOTE_TERMS: "Conditions générales",
  CONTRACT_BODY: "Corps du contrat",
  CONTRACT_CLAUSE: "Clause particulière",
  EMAIL_DRAFT: "E-mail d'accompagnement",
  MEETING_SUMMARY: "Compte rendu de RDV",
  CAMPAIGN_MESSAGE: "Message de campagne",
  CAMPAIGN_VARIANTS: "Trois variantes de message",
};
