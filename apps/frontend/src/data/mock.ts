import type { Campaign, Client, KpiSummary, Opportunity, PipelineStage } from "@/types";

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
  { id: "o1", clientName: "Sunu Assurances", sector: "Assurance", product: "SMS Marketing", country: "Sénégal", value: 4_200_000, probability: 20, stage: "prospection", owner: "Moussa Traoré", updatedAt: "2026-07-10" },
  {
    id: "o2",
    clientName: "Bank of Africa CI",
    sector: "Banque & Finance",
    product: "OTP",
    country: "Côte d'Ivoire",
    value: 8_900_000,
    probability: 25,
    stage: "prospection",
    owner: "Aïcha Koné",
    updatedAt: "2026-07-14",
    qualification: {
      "prospection.problematique": "Taux d'échec élevé sur les OTP mobile banking envoyés par l'agrégateur actuel.",
      "prospection.solution_existante": "Oui, contrat avec un agrégateur régional depuis 2023.",
      "prospection.decideur": "DSI + Directeur Digital, arbitrage conjoint.",
      "prospection.budget_estime": "Environ 8 à 10 M FCFA / an.",
    },
  },
  { id: "o3", clientName: "Total Énergies CI", sector: "Énergie", product: "API SMS", country: "Côte d'Ivoire", value: 6_500_000, probability: 45, stage: "business_case", owner: "Aïcha Koné", updatedAt: "2026-07-15" },
  {
    id: "o4",
    clientName: "Jumia Côte d'Ivoire",
    sector: "Grande distribution",
    product: "WhatsApp",
    country: "Côte d'Ivoire",
    value: 5_100_000,
    probability: 50,
    stage: "business_case",
    owner: "Moussa Traoré",
    updatedAt: "2026-07-12",
    qualification: {
      "prospection.problematique": "Confirmations de commande peu lues par SMS, veut passer au WhatsApp Business.",
      "prospection.decideur": "Head of CRM Jumia CI.",
      "business_case.produit": "WhatsApp Business API",
      "business_case.cas_usage": "Confirmation de commande + suivi de livraison.",
      "business_case.gain_potentiel": "Gain estimé : hausse du taux de lecture de 40 % à 92 %.",
    },
  },
  { id: "o5", clientName: "CNPS", sector: "Banque & Finance", product: "SMS Marketing", country: "Côte d'Ivoire", value: 3_400_000, probability: 60, stage: "bon_commande", owner: "Sarah Bamba", updatedAt: "2026-07-16" },
  { id: "o6", clientName: "Prosuma", sector: "Grande distribution", product: "OTP", country: "Côte d'Ivoire", value: 7_800_000, probability: 65, stage: "bon_commande", owner: "Aïcha Koné", updatedAt: "2026-07-11" },
  { id: "o7", clientName: "SGCI — Société Générale", sector: "Banque & Finance", product: "API SMS", country: "Côte d'Ivoire", value: 12_300_000, probability: 80, stage: "negociation", owner: "Sarah Bamba", updatedAt: "2026-07-09" },
  {
    id: "o8",
    clientName: "Sonatel",
    sector: "Énergie",
    product: "Voice",
    country: "Sénégal",
    value: 9_600_000,
    probability: 85,
    stage: "negociation",
    owner: "Moussa Traoré",
    updatedAt: "2026-07-08",
    qualification: {
      "negociation.produit": "Voice — notifications sortantes",
      "negociation.taille_deal": "9 600 000 FCFA / an",
      "negociation.contre_proposition": "Oui, demande -12 % sur le tarif à la minute au-delà de 500k min/mois.",
      "negociation.statut_deal": "En cours d'arbitrage interne côté client.",
    },
  },
  {
    id: "o9",
    clientName: "Ecobank CI",
    sector: "Banque & Finance",
    product: "API SMS",
    country: "Côte d'Ivoire",
    value: 15_000_000,
    probability: 90,
    stage: "closing",
    owner: "Aïcha Koné",
    updatedAt: "2026-07-05",
    qualification: {
      "closing.produit": "API SMS",
      "closing.date_signature": "2026-07-25",
      "closing.documents": "Contrat cadre + bon de commande",
      "closing.signataire_client": "Awa Diabaté, Directrice des Opérations",
    },
    payments: [{ id: "pay-o9-1", amount: 5_000_000, date: "2026-07-06", channel: "Virement bancaire", comment: "Acompte 1/3 à la signature" }],
  },
  { id: "o10", clientName: "NSIA Assurances", sector: "Assurance", product: "WhatsApp", country: "Côte d'Ivoire", value: 4_800_000, probability: 95, stage: "closing", owner: "Sarah Bamba", updatedAt: "2026-07-03" },
  {
    id: "o11",
    clientName: "Carrefour Sénégal",
    sector: "Grande distribution",
    product: "SMS Marketing",
    country: "Sénégal",
    value: 6_100_000,
    probability: 100,
    stage: "go_live",
    owner: "Moussa Traoré",
    updatedAt: "2026-06-28",
    goLiveChecklist: {
      compte_client_cree: true,
      integration_technique_identifiee: true,
      api_integree: true,
      plan_test_partage: true,
      tests_effectues: true,
      email_golive_envoye: false,
    },
    payments: [{ id: "pay-o11-1", amount: 6_100_000, date: "2026-06-30", channel: "Mobile Money", comment: "Paiement intégral" }],
  },
  {
    id: "o12",
    clientName: "CIE",
    sector: "Énergie",
    product: "OTP",
    country: "Côte d'Ivoire",
    value: 21_400_000,
    probability: 100,
    stage: "go_live",
    owner: "Aïcha Koné",
    updatedAt: "2026-06-20",
    goLiveChecklist: {
      compte_client_cree: true,
      integration_technique_identifiee: true,
      api_integree: true,
      plan_test_partage: true,
      tests_effectues: false,
      email_golive_envoye: false,
    },
  },
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
  prospection: "Prospection",
  business_case: "Business case",
  bon_commande: "Bon de commande",
  negociation: "Négociation",
  closing: "Closing",
  go_live: "Go live",
};

export interface QualificationField {
  key: string;
  label: string;
}

export interface QualificationSection {
  stage: Exclude<PipelineStage, "go_live">;
  title: string;
  /** Correspond à l'onglet du classeur "Reporting Commercial" utilisé par les commerciaux. */
  sourceSheet: string;
  fields: QualificationField[];
}

/**
 * Grilles de qualification par étape du pipeline, reprises telles quelles du
 * classeur "Reporting Commercial 2026" (un onglet par étape). Chaque champ
 * est stocké dans Opportunity.qualification sous la clé "<stage>.<key>".
 */
export const qualificationSections: QualificationSection[] = [
  {
    stage: "prospection",
    title: "Prospection — grille de qualification",
    sourceSheet: "PROSPECTION",
    fields: [
      { key: "problematique", label: "Quelle est la problématique actuelle du client ?" },
      { key: "solution_existante", label: "Dispose-t-il déjà d’une solution ?" },
      { key: "concurrents", label: "Quels sont les concurrents en lice ? (Y a-t-il d’autres fournisseurs en compétition ?)" },
      { key: "fournisseur_actuel", label: "Quel est le fournisseur actuel et quelles sont ses conditions ?" },
      { key: "autres_besoins", label: "Avez-vous identifié d’autres besoins auxquels nous pourrions répondre ?" },
      { key: "decideur", label: "Qui est le décideur ?" },
      { key: "autres_influenceurs", label: "Qui d’autre influence la décision ?" },
      { key: "seance_prevue", label: "Une séance de travail est-elle prévue avec le décideur ?" },
      { key: "acces_decideur", label: "Comment envisagez-vous d’atteindre le décideur ?" },
      { key: "canal_prefere", label: "Quel est le canal de contact privilégié par le client ?" },
      { key: "solution_proposee", label: "Quelle solution proposez-vous ?" },
      { key: "secteur_activite", label: "Quel est le secteur d’activité du client ?" },
      { key: "cas_usage", label: "Quels sont les cas d’usage envisagés ?" },
      { key: "besoins_reels", label: "Quels sont les besoins réels du client ?" },
      { key: "objections", label: "Quelles sont ses principales objections ?" },
      { key: "prochaines_etapes", label: "Quelles sont les prochaines étapes ?" },
      { key: "budget_estime", label: "Quel est le budget estimé du client ? (Cela permet de calibrer l’offre dès le départ.)" },
      { key: "urgence", label: "Quelle est l’urgence du besoin ? (Le client a-t-il une échéance critique ou un projet en cours ?)" },
      { key: "cycle_decision", label: "Quel est le cycle de décision ? (Combien de temps lui faut-il pour valider un achat ?)" },
      { key: "historique_relation", label: "Quel est l’historique de la relation ? (Y a-t-il eu des échanges ou collaborations passées ?)" },
      { key: "criteres_choix", label: "Quels sont les critères de choix du client ? (Prix, service, innovation, accompagnement…)" },
      { key: "maturite_digitale", label: "Quel est son niveau de maturité digitale ? (Cela peut influencer la solution à proposer.)" },
    ],
  },
  {
    stage: "business_case",
    title: "Business case — qualification commerciale",
    sourceSheet: "BUSINESS CASE",
    fields: [
      { key: "produit", label: "Produit proposé" },
      { key: "cas_usage", label: "Cas d’usage envisagé" },
      { key: "gain_potentiel", label: "Combien pouvons-nous gagner avec ce client (selon le cas d’usage) ?" },
      { key: "seance_decideur", label: "Avez-vous eu une séance de travail avec le décideur ?" },
      { key: "personnalite", label: "Quelle est sa personnalité ?" },
      { key: "facteur_bascule", label: "Qu’est-ce qui pourrait faire basculer le deal ?" },
      { key: "impact_attendu", label: "Impact attendu pour le client : gains de productivité, réduction des coûts, amélioration de l’expérience client…" },
      { key: "risques_percus", label: "Risques perçus par le client : migration, sécurité, adoption interne…" },
      { key: "plan_deploiement", label: "Plan de déploiement envisagé : étapes, calendrier, ressources nécessaires." },
      { key: "kpis_succes", label: "Indicateurs de succès (KPIs) : comment le client mesurera la réussite ?" },
    ],
  },
  {
    stage: "bon_commande",
    title: "Bon de commande — suivi",
    sourceSheet: "BON DE COMMANDE",
    fields: [
      { key: "produit", label: "Produit proposé" },
      { key: "valeur_opportunite", label: "Valeur de l’opportunité" },
      { key: "mode_paiement", label: "Mode de paiement souhaité par le client" },
      { key: "date_paiement_espere", label: "Quand pouvons-nous espérer le paiement ?" },
      { key: "autres_details", label: "Autres détails importants" },
      { key: "conditions_contractuelles", label: "Conditions contractuelles spécifiques : durée d’engagement, SLA, support…" },
      { key: "responsable_admin_client", label: "Responsable administratif côté client (pour fluidifier la signature et le paiement)" },
      { key: "documents_requis", label: "Documents requis : bon de commande, devis signé, contrat…" },
    ],
  },
  {
    stage: "negociation",
    title: "Négociation — suivi du deal",
    sourceSheet: "NEGOCIATION",
    fields: [
      { key: "produit", label: "Produit proposé" },
      { key: "taille_deal", label: "Taille du deal (chiffre)" },
      { key: "contre_proposition", label: "Le client a-t-il fait une contre-proposition ?" },
      { key: "statut_deal", label: "Quel est le statut du deal ?" },
      { key: "objections_client", label: "Quelles sont les objections du client ?" },
      { key: "parametre_declencheur", label: "Quel paramètre pourrait déclencher la vente ?" },
      { key: "autre_influenceur", label: "Avez-vous identifié une autre personne pouvant influencer la décision finale ?" },
      { key: "strategie_conclusion", label: "Quelle est votre stratégie pour conclure le deal ?" },
      { key: "historique_echanges", label: "Historique des échanges (pour garder une trace des concessions et arguments)" },
      { key: "scenario_repli", label: "Scénario de repli : une version allégée de l’offre si le budget est limité." },
      { key: "plan_escalade", label: "Plan d’escalade : si le deal bloque, qui peut débloquer la situation ?" },
      { key: "engagements_mutuels", label: "Engagements mutuels : ce que le client attend de toi et vice versa." },
    ],
  },
  {
    stage: "closing",
    title: "Closing — finalisation",
    sourceSheet: "CLOSING",
    fields: [
      { key: "produit", label: "Produit proposé" },
      { key: "date_signature", label: "Date prévue de signature" },
      { key: "documents", label: "Document(s) à finaliser : bon de commande, contrat, devis…" },
      { key: "engagements_client", label: "Engagements pris par le client (verbaux ou écrits)" },
      { key: "derniers_points", label: "Derniers points à valider : juridiques, techniques, administratifs" },
      { key: "signataire_client", label: "Personne en charge de la signature côté client" },
      { key: "suivi_commercial", label: "Personne en charge du suivi côté commercial" },
      { key: "plan_onboarding", label: "Plan d’onboarding ou de démarrage : formation, intégration, accompagnement" },
      { key: "risques_apres_signature", label: "Risques éventuels après signature : désengagement, retard de paiement, changement d’interlocuteur" },
      { key: "feedback_client", label: "Feedback du client sur le processus de vente" },
    ],
  },
];

/**
 * Check-list de mise en service, reprise de l'onglet "GO LIVE" du classeur
 * "Reporting Commercial 2026". Stockée dans Opportunity.goLiveChecklist.
 */
export const goLiveChecklistItems: QualificationField[] = [
  { key: "produit_propose", label: "Produit proposé au client" },
  { key: "prix_partages", label: "Prix partagés au client" },
  { key: "signataire_identifie", label: "Personne en charge de la signature côté client identifiée" },
  { key: "signature_obtenue", label: "Signature côté client obtenue" },
  { key: "compte_client_cree", label: "Compte client créé" },
  { key: "integration_technique_identifiee", label: "Personne en charge de l’intégration technique identifiée" },
  { key: "api_integree", label: "API intégrée" },
  { key: "plan_test_partage", label: "Plan de test partagé" },
  { key: "tests_effectues", label: "Tests effectués" },
  { key: "compte_provisionne", label: "Compte client provisionné" },
  { key: "email_golive_envoye", label: "Email de Go Live envoyé au client" },
];
