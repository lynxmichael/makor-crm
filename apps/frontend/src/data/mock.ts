import type { Campaign, Client, KpiSummary, Opportunity } from "@/types";

export const sectors = [
  "Banque & Finance",
  "Assurance",
  "Grande distribution",
  "Santé",
  "Éducation",
  "Transport & Logistique",
  "Énergie",
];

export const countries = ["Côte d'Ivoire", "Sénégal", "Mali", "Bénin", "Togo"];

export const mockClients: Client[] = [
  { id: "c1", name: "Ecobank CI", sector: "Banque & Finance", country: "Côte d'Ivoire", contact: "Awa Diabaté", email: "a.diabate@ecobank.ci", phone: "+225 07 01 22 33 44", status: "actif", volumeYtd: 812_400, marginYtd: 9_340_000 },
  { id: "c2", name: "NSIA Assurances", sector: "Assurance", country: "Côte d'Ivoire", contact: "Jean-Paul Kouassi", email: "jp.kouassi@nsia.ci", phone: "+225 05 44 12 09 88", status: "actif", volumeYtd: 456_200, marginYtd: 5_120_000 },
  { id: "c3", name: "Carrefour Sénégal", sector: "Grande distribution", country: "Sénégal", contact: "Fatou Ndiaye", email: "f.ndiaye@carrefour.sn", phone: "+221 77 512 90 21", status: "actif", volumeYtd: 1_204_800, marginYtd: 14_760_000 },
  { id: "c4", name: "Clinique Pasteur", sector: "Santé", country: "Côte d'Ivoire", contact: "Dr Serge Yao", email: "s.yao@pasteur-ci.com", phone: "+225 01 88 34 21 09", status: "actif", volumeYtd: 98_600, marginYtd: 1_180_000 },
  { id: "c5", name: "Université Cheikh Anta Diop", sector: "Éducation", country: "Sénégal", contact: "Mariam Sow", email: "m.sow@ucad.sn", phone: "+221 78 220 41 15", status: "actif", volumeYtd: 322_100, marginYtd: 2_940_000 },
  { id: "c6", name: "Bolloré Transport & Logistics", sector: "Transport & Logistique", country: "Bénin", contact: "Roland Agbo", email: "r.agbo@bollore.bj", phone: "+229 96 04 55 12", status: "actif", volumeYtd: 645_000, marginYtd: 6_050_000 },
  { id: "c7", name: "CIE — Compagnie Ivoirienne d'Électricité", sector: "Énergie", country: "Côte d'Ivoire", contact: "Beatrice Assi", email: "b.assi@cie.ci", phone: "+225 07 66 90 12 45", status: "actif", volumeYtd: 2_310_000, marginYtd: 21_400_000 },
  { id: "c8", name: "Orange Bank Togo", sector: "Banque & Finance", country: "Togo", contact: "Kokou Mensah", email: "k.mensah@orangebank.tg", phone: "+228 90 12 33 87", status: "archive", volumeYtd: 41_200, marginYtd: 380_000 },
];

export const mockOpportunities: Opportunity[] = [
  { id: "o1", clientName: "Sunu Assurances", sector: "Assurance", product: "SMS Marketing", country: "Sénégal", value: 4_200_000, probability: 20, stage: "prospect", owner: "Moussa Traoré", updatedAt: "2026-07-10" },
  { id: "o2", clientName: "Bank of Africa CI", sector: "Banque & Finance", product: "OTP", country: "Côte d'Ivoire", value: 8_900_000, probability: 25, stage: "prospect", owner: "Aïcha Koné", updatedAt: "2026-07-14" },
  { id: "o3", clientName: "Total Énergies CI", sector: "Énergie", product: "API SMS", country: "Côte d'Ivoire", value: 6_500_000, probability: 45, stage: "rdv", owner: "Aïcha Koné", updatedAt: "2026-07-15" },
  { id: "o4", clientName: "Jumia Côte d'Ivoire", sector: "Grande distribution", product: "WhatsApp", country: "Côte d'Ivoire", value: 5_100_000, probability: 50, stage: "rdv", owner: "Moussa Traoré", updatedAt: "2026-07-12" },
  { id: "o5", clientName: "CNPS", sector: "Banque & Finance", product: "SMS Marketing", country: "Côte d'Ivoire", value: 3_400_000, probability: 60, stage: "proposition", owner: "Sarah Bamba", updatedAt: "2026-07-16" },
  { id: "o6", clientName: "Prosuma", sector: "Grande distribution", product: "OTP", country: "Côte d'Ivoire", value: 7_800_000, probability: 65, stage: "proposition", owner: "Aïcha Koné", updatedAt: "2026-07-11" },
  { id: "o7", clientName: "SGCI — Société Générale", sector: "Banque & Finance", product: "API SMS", country: "Côte d'Ivoire", value: 12_300_000, probability: 80, stage: "bon_commande", owner: "Sarah Bamba", updatedAt: "2026-07-09" },
  { id: "o8", clientName: "Sonatel", sector: "Énergie", product: "Voice", country: "Sénégal", value: 9_600_000, probability: 85, stage: "bon_commande", owner: "Moussa Traoré", updatedAt: "2026-07-08" },
  { id: "o9", clientName: "Ecobank CI", sector: "Banque & Finance", product: "API SMS", country: "Côte d'Ivoire", value: 15_000_000, probability: 90, stage: "contrat", owner: "Aïcha Koné", updatedAt: "2026-07-05" },
  { id: "o10", clientName: "NSIA Assurances", sector: "Assurance", product: "WhatsApp", country: "Côte d'Ivoire", value: 4_800_000, probability: 95, stage: "contrat", owner: "Sarah Bamba", updatedAt: "2026-07-03" },
  { id: "o11", clientName: "Carrefour Sénégal", sector: "Grande distribution", product: "SMS Marketing", country: "Sénégal", value: 6_100_000, probability: 100, stage: "vente", owner: "Moussa Traoré", updatedAt: "2026-06-28" },
  { id: "o12", clientName: "CIE", sector: "Énergie", product: "OTP", country: "Côte d'Ivoire", value: 21_400_000, probability: 100, stage: "vente", owner: "Aïcha Koné", updatedAt: "2026-06-20" },
];

export const mockCampaigns: Campaign[] = [
  { id: "cp1", name: "Relance impayés — Juillet", client: "CIE", product: "SMS Marketing", country: "Côte d'Ivoire", sentAt: "2026-07-17", volume: 84_200, deliveryRate: 98.4, status: "terminee" },
  { id: "cp2", name: "OTP connexion mobile banking", client: "Ecobank CI", product: "OTP", country: "Côte d'Ivoire", sentAt: "2026-07-17", volume: 212_000, deliveryRate: 99.1, status: "en_cours" },
  { id: "cp3", name: "Promo rentrée scolaire", client: "Carrefour Sénégal", product: "WhatsApp", country: "Sénégal", sentAt: "2026-07-16", volume: 63_500, deliveryRate: 76.2, status: "anomalie" },
  { id: "cp4", name: "Notification sinistre", client: "NSIA Assurances", product: "API SMS", country: "Côte d'Ivoire", sentAt: "2026-07-16", volume: 12_400, deliveryRate: 97.8, status: "terminee" },
  { id: "cp5", name: "Campagne fidélité Q3", client: "Prosuma", product: "SMS Marketing", country: "Côte d'Ivoire", sentAt: "2026-07-18", volume: 158_900, deliveryRate: 0, status: "programmee" },
  { id: "cp6", name: "Confirmation rendez-vous", client: "Clinique Pasteur", product: "Voice", country: "Côte d'Ivoire", sentAt: "2026-07-15", volume: 3_100, deliveryRate: 94.6, status: "terminee" },
];

export const kpis: KpiSummary[] = [
  { label: "Chiffre d'affaires — juillet", value: "184,2 M FCFA", delta: "+12,4 % vs juin", deltaTone: "signal", level: 4 },
  { label: "Volume messages — 30 j", value: "3,42 M", delta: "+6,8 % vs 30 j préc.", deltaTone: "signal", level: 3 },
  { label: "Marge globale", value: "38,6 %", delta: "-1,1 pt vs juin", deltaTone: "alert", level: 2 },
  { label: "Taux de signature BC", value: "61 %", delta: "+4 pts vs juin", deltaTone: "signal", level: 3 },
];

export const pipelineStageLabels: Record<Opportunity["stage"], string> = {
  prospect: "Prospect",
  rdv: "RDV",
  proposition: "Proposition",
  bon_commande: "Bon de commande",
  contrat: "Contrat",
  vente: "Vente",
};
