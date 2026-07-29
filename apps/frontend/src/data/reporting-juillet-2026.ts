/**
 * Données reprises telles quelles du classeur "Reporting Juillet 2026"
 * (reporting opérationnel réel — volumes, marges, encaissements, incidents SMS).
 * Deux libellés clients quasi identiques dans la source ("Ignite Acces/Access
 * Energy", "SANLAM_ALLIANZBF"/"SANLIAM_ALLIANZBF") ont été harmonisés ici sur
 * une seule orthographe ; toutes les valeurs numériques sont inchangées.
 */

export const julySummary = {
  period: "Juillet 2026",
  volumeSms: 89_765,
  margeTotale: 180_523.71,
  clientsActifs: 18,
  margeParSms: 2.011070127555283,
  rechargements: 510_000,
  rejetsSms: 19_260,
};

export interface ClientMetric {
  client: string;
  value: number;
}

export const topClientsParVolume: ClientMetric[] = [
  { client: "Ignite Access Energy", value: 61_435 },
  { client: "IIPEA", value: 13_914 },
  { client: "SANLAM_ALLIANZBF", value: 10_447 },
  { client: "ESMA Abidjan", value: 1_217 },
  { client: "ESMA Bouaké", value: 1_103 },
  { client: "ESCEN_SMS", value: 707 },
  { client: "Babynoula", value: 346 },
  { client: "Cliniq Oliviers", value: 194 },
  { client: "Seleai Solutions", value: 183 },
  { client: "PressDuGolf", value: 102 },
];

export const topClientsParMarge: ClientMetric[] = [
  { client: "IIPEA", value: 69_163.54 },
  { client: "Ignite Access Energy", value: 61_484.39 },
  { client: "ESMA Abidjan", value: 15_869.95 },
  { client: "ESMA Bouaké", value: 14_382.14 },
  { client: "Cliniq Oliviers", value: 7_591 },
  { client: "ESCEN_SMS", value: 4_823.12 },
  { client: "Babynoula", value: 2_415.74 },
  { client: "SANLAM_ALLIANZBF", value: 2_261.33 },
  { client: "Seleai Solutions", value: 1_454.81 },
  { client: "NEXUS SMS", value: 341.98 },
];

export interface CountryMetric {
  country: string;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  total: number;
  evolution: number;
  observation: "Stable" | "Progression" | "Forte progression" | "Régression";
}

export const volumeParPays: CountryMetric[] = [
  { country: "Bénin", week1: 0, week2: 0, week3: 0, week4: 0, total: 0, evolution: 0, observation: "Stable" },
  { country: "Burkina Faso", week1: 8_474.68, week2: 134, week3: 0, week4: 0, total: 8_608.68, evolution: -0.984, observation: "Régression" },
  { country: "Côte d'Ivoire", week1: 46_266.9, week2: 51_848, week3: 0, week4: 0, total: 98_114.9, evolution: 0.121, observation: "Progression" },
  { country: "Sénégal", week1: 1_415.06, week2: 5, week3: 0, week4: 0, total: 1_420.06, evolution: -0.996, observation: "Régression" },
  { country: "Togo", week1: 2_829.11, week2: 707, week3: 0, week4: 0, total: 3_536.11, evolution: -0.75, observation: "Régression" },
];

export const margeParPays: CountryMetric[] = [
  { country: "Bénin", week1: 0, week2: 0, week3: 0, week4: 0, total: 0, evolution: 0, observation: "Stable" },
  { country: "Burkina Faso", week1: 5_841, week2: 1_452.83, week3: 0, week4: 0, total: 7_293.83, evolution: -0.751, observation: "Régression" },
  { country: "Côte d'Ivoire", week1: 25_872, week2: 115_112.67, week3: 0, week4: 0, total: 140_984.67, evolution: 3.449, observation: "Forte progression" },
  { country: "Sénégal", week1: 178, week2: 39.75, week3: 0, week4: 0, total: 217.75, evolution: -0.777, observation: "Régression" },
  { country: "Togo", week1: 466, week2: 4_932.71, week3: 0, week4: 0, total: 5_398.71, evolution: 9.585, observation: "Forte progression" },
];

export interface Recharge {
  date: string;
  client: string;
  produit: string;
  montant: number;
}

export const rechargements: Recharge[] = [
  { date: "02 juil. 2026", client: "ESCEN", produit: "Acecom Pro", montant: 20_000 },
  { date: "02 juil. 2026", client: "Babynoula", produit: "Acecom Pro", montant: 10_000 },
  { date: "04 juil. 2026", client: "ESMA", produit: "Acecom Pro", montant: 134_000 },
  { date: "06 juil. 2026", client: "IIPEA", produit: "Acecom Pro", montant: 200_000 },
  { date: "11 juil. 2026", client: "Académie Elites", produit: "Nexus", montant: 146_000 },
];

export interface SmsRejection {
  date: string;
  client: string;
  rejets: number;
  codeErreur: number;
}

export const rejetsSmsDetail: SmsRejection[] = [
  { date: "03 juil. 2026", client: "IIPEA", rejets: 956, codeErreur: 69 },
  { date: "03 juil. 2026", client: "ANAGEDCI", rejets: 556, codeErreur: 69 },
  { date: "Du 6 au 11 juillet", client: "PressDuGolf", rejets: 197, codeErreur: 69 },
  { date: "6 et 10 juillet", client: "Jaxe Communication", rejets: 8, codeErreur: 69 },
  { date: "Du 6 au 11 juillet", client: "Ignite Access Energy", rejets: 17_543, codeErreur: 0 },
];

export interface PrepaidBalance {
  client: string;
  /** Solde en FCFA, ou "Postpayé" pour les clients facturés en post-paiement. */
  solde: number | "Postpayé";
}

export const soldesPrepayes: PrepaidBalance[] = [
  { client: "SANLAM_ALLIANZBF", solde: 687_333.33 },
  { client: "EXANORA", solde: 142_197.7 },
  { client: "IIPEA", solde: 127_739.82 },
  { client: "Seleai Solutions", solde: 109_893.29 },
  { client: "Gandyamligdi", solde: 66_284.03 },
  { client: "NEXUS SMS", solde: 62_086.33 },
  { client: "cda_motors", solde: 56_879.55 },
  { client: "GoFASO", solde: 50_418.95 },
  { client: "Cliniq Oliviers", solde: 42_069.19 },
  { client: "EXPERTISEIT", solde: 35_470.22 },
  { client: "ESCA CINE", solde: 26_529.52 },
  { client: "ESMA Bouaké", solde: 26_624.97 },
  { client: "Jaxcommunication", solde: 8_710.73 },
  { client: "Lunette Oravision", solde: 8_824.81 },
  { client: "Babynoula", solde: 7_745.45 },
  { client: "CDLESALUT", solde: 8_197.23 },
  { client: "PressDuGolf", solde: 6_589.27 },
  { client: "ESMA Abidjan", solde: 5_726.18 },
  { client: "ITESGROUPE", solde: 5_025.94 },
  { client: "ESCEN_SMS", solde: 12_944.63 },
  { client: "Ignite Access Energy", solde: "Postpayé" },
  { client: "Laposte BF", solde: "Postpayé" },
];

export const syntheseRecommandations = [
  {
    titre: "Performance globale",
    texte: "89 765 SMS consommés pour une marge totale de 180 523,71 FCFA.",
  },
  {
    titre: "Rentabilité",
    texte: "La marge moyenne par SMS s'établit à 2,01 FCFA. Cet indicateur doit être suivi avec le volume.",
  },
  {
    titre: "Suivi clients",
    texte: "Prioriser les grands comptes, accompagner les clients en régression et stimuler les comptes à faible volume.",
  },
];
