import type { UserSummary } from "./api";

/** Miroir de l'enum Prisma `ResourceCategory`. */
export type ResourceCategory =
  | "GENERAL"
  | "PRISE_EN_MAIN"
  | "CLIENTS"
  | "PIPELINE"
  | "CAMPAGNES"
  | "DEVIS_COMMANDES"
  | "CONTRATS"
  | "FACTURATION"
  | "SENDER_ID"
  | "AGENDA"
  | "DOCUMENTS"
  | "REPORTING"
  | "PARAMETRES";

export type ResourceType = "DOCUMENT" | "VIDEO" | "LIEN" | "ARTICLE";

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: ResourceCategory;
  type: ResourceType;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  url: string | null;
  content: string | null;
  position: number;
  isPublished: boolean;
  viewCount: number;
  createdById: string;
  createdBy?: UserSummary;
  createdAt: string;
  updatedAt: string;
}

/** Le backend renvoie déjà les ressources groupées par module. */
export interface ResourceGroups {
  total: number;
  groups: { category: ResourceCategory; items: Resource[] }[];
}

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  GENERAL: "Général",
  PRISE_EN_MAIN: "Prise en main",
  CLIENTS: "Clients et prospects",
  PIPELINE: "Pipeline commercial",
  CAMPAGNES: "Campagnes",
  DEVIS_COMMANDES: "Devis et bons de commande",
  CONTRATS: "Contrats",
  FACTURATION: "Facturation et encaissements",
  SENDER_ID: "Sender ID",
  AGENDA: "Agenda",
  DOCUMENTS: "Documents",
  REPORTING: "Reporting",
  PARAMETRES: "Paramètres",
};

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  DOCUMENT: "Document",
  VIDEO: "Vidéo",
  LIEN: "Lien",
  ARTICLE: "Article",
};
