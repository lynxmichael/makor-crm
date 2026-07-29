export type PipelineStage =
  | "prospection"
  | "business_case"
  | "bon_commande"
  | "negociation"
  | "closing"
  | "go_live";

export type Product =
  | "SMS Marketing"
  | "OTP"
  | "API SMS"
  | "WhatsApp"
  | "Voice"
  | "Sender ID";

export type Role =
  | "Super Admin"
  | "Admin ventes"
  | "Superviseur"
  | "Commercial"
  | "Manager";

export interface Client {
  id: string;
  name: string;
  sector: string;
  country: string;
  contact: string;
  email: string;
  phone: string;
  status: "actif" | "archive";
  volumeYtd: number;
  marginYtd: number;
}

export type ProspectStatus = "Nouveau" | "Contacté" | "RDV programmé" | "Qualifié" | "Converti" | "Sans suite";

export interface Prospect {
  id: string;
  /** Nom de l'entreprise */
  name: string;
  /** Secteur d'activité */
  sector: string;
  status: ProspectStatus;
  /** Canal de contact privilégié (appel, e-mail, WhatsApp, LinkedIn…) */
  contactChannel: string;
  /** Personne contact */
  contactName: string;
  /** Position du contact chez le prospect */
  contactPosition: string;
  /** Téléphone ou e-mail du contact */
  contactInfo: string;
  /** Commercial assigné */
  owner: string;
}

export interface Opportunity {
  id: string;
  clientName: string;
  sector: string;
  product: Product;
  country: string;
  value: number;
  probability: number;
  stage: PipelineStage;
  owner: string;
  updatedAt: string;
  /** Réponses de la grille de qualification (clé de section + clé de champ, ex. "prospection.decideur"). */
  qualification?: Record<string, string>;
  /** Check-list de mise en service (section Go Live). */
  goLiveChecklist?: Record<string, boolean>;
  /** Règlements encaissés sur cette opportunité. */
  payments?: Payment[];
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  channel: string;
  comment?: string;
}

export interface Campaign {
  id: string;
  name: string;
  client: string;
  product: Product;
  country: string;
  sentAt: string;
  volume: number;
  deliveryRate: number;
  status: "programmee" | "en_cours" | "terminee" | "anomalie";
}

export interface KpiSummary {
  label: string;
  value: string;
  delta: string;
  deltaTone: "signal" | "alert";
  level: 1 | 2 | 3 | 4;
}

export interface ModuleRow {
  [key: string]: string | number;
}

export interface ModuleColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  mono?: boolean;
}
