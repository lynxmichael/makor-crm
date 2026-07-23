export type PipelineStage =
  | "prospect"
  | "rdv"
  | "proposition"
  | "bon_commande"
  | "contrat"
  | "vente";

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
