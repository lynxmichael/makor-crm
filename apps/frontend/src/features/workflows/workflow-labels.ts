/** Libellés partagés entre la liste et le formulaire de règles. */
export const TRIGGER_LABELS: Record<string, string> = {
  DEAL_STAGE_CHANGED: "Affaire changée d'étape",
  DEAL_CREATED: "Opportunité créée",
  QUOTE_SENT: "Devis envoyé",
  QUOTE_ACCEPTED: "Devis accepté",
  QUOTE_REJECTED: "Devis refusé",
  PURCHASE_ORDER_SIGNED: "Bon de commande signé",
  CONTRACT_ACTIVATED: "Contrat activé",
  INVOICE_SENT: "Facture émise",
  INVOICE_PAID: "Facture encaissée",
  INVOICE_OVERDUE: "Facture échue",
  CUSTOMER_CREATED: "Client créé",
  LEAD_CREATED: "Prospect créé",
  ACTIVITY_OVERDUE: "Activité en retard",
  CAMPAIGN_FINISHED: "Campagne terminée",
  SIGNATURE_SIGNED: "Document signé",
  SIGNATURE_REFUSED: "Signature refusée",
};

/**
 * Déclencheurs réellement instrumentés côté serveur. Les autres figurent
 * dans l'énumération mais n'émettent pas encore d'événement : les proposer
 * sans le signaler laisserait créer des règles muettes.
 */
export const WIRED_TRIGGERS = new Set(["DEAL_STAGE_CHANGED", "INVOICE_PAID"]);

export const ACTION_LABELS: Record<string, string> = {
  NOTIFY_USER: "Notifier un agent",
  NOTIFY_ROLE: "Notifier un rôle",
  SEND_EMAIL: "Envoyer un e-mail",
  CREATE_ACTIVITY: "Créer une activité",
  ASSIGN_OWNER: "Réaffecter",
  POST_COMMENT: "Publier un commentaire",
  CALL_WEBHOOK: "Appeler un webhook",
};

export const OPERATOR_LABELS: Record<string, string> = {
  eq: "est égal à",
  ne: "est différent de",
  gt: "est supérieur à",
  gte: "est supérieur ou égal à",
  lt: "est inférieur à",
  lte: "est inférieur ou égal à",
  contains: "contient",
  isSet: "est renseigné",
  isEmpty: "est vide",
};
