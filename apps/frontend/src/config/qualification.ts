/**
 * Référentiel de qualification commerciale (CDC §4.6).
 *
 * Ce ne sont pas des données de démonstration mais la méthode de vente de
 * MAKOR, reprise des grilles Excel existantes. Elles vivent donc dans la
 * configuration, pas dans les mocks : les réponses saisies sont persistées
 * sur `Deal.qualification`.
 */

/** Étapes portant une grille de questions. Go live a une liste de contrôle. */
export type QualificationStage =
  | "prospection"
  | "business_case"
  | "bon_commande"
  | "negociation"
  | "closing";

export interface QualificationField {
  key: string;
  label: string;
}

export interface QualificationSection {
  stage: QualificationStage;
  title: string;
  /** Correspond à l'onglet du classeur "Reporting Commercial" utilisé par les commerciaux. */
  sourceSheet: string;
  fields: QualificationField[];
}

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
      { key: "documents_requis", label: "Documents requis : facture proforma signée, contrat…" },
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
      { key: "documents", label: "Document(s) à finaliser : facture proforma, contrat…" },
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

export const pipelineStageLabels: Record<QualificationStage | "go_live", string> = {
  prospection: "Prospection",
  business_case: "Business case",
  bon_commande: "Bon de commande",
  negociation: "Négociation",
  closing: "Closing",
  go_live: "Go live",
};
