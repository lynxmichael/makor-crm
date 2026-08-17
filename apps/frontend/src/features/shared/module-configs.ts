import {
  Building2,
  CalendarDays,
  FileSignature,
  FolderOpen,
  ScrollText,
  ShieldCheck,
  Signpost,
  Wallet,
} from "lucide-react";

import {
  activitiesService,
  auditService,
  contractsService,
  documentsService,
  leadsService,
  paymentsService,
  senderIdService,
} from "@/services/resources";
import { QK } from "@/config/constants";
import type { ModuleConfig, ResourceService } from "./module-config";

/*
  Un module = un objet. Les valeurs d'enum et les noms de champs sont repris
  tels quels de `prisma/schema.prisma` : le backend tourne en
  `forbidNonWhitelisted`, tout écart produit un 400 et non un champ ignoré.
*/

const plural = (noun: string) => (total: number) =>
  `${total} ${noun}${total > 1 ? "s" : ""}`;

// ---------------------------------------------------------------------------
// Prospects (CDC §4.4)
// ---------------------------------------------------------------------------

const LEAD_STATUSES = {
  NEW: "Nouveau",
  CONTACTED: "Contacté",
  QUALIFIED: "Qualifié",
  PROPOSAL_SENT: "Proposition envoyée",
  NEGOTIATION: "Négociation",
  WON: "Gagné",
  LOST: "Perdu",
} as const;

const LEAD_SOURCES = {
  WEBSITE: "Site web",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  PHONE: "Téléphone",
  REFERRAL: "Recommandation",
  EVENT: "Événement",
  OTHER: "Autre",
} as const;

export const prospectsConfig: ModuleConfig = {
  title: "Prospects",
  subtitle: plural("prospect"),
  createLabel: "Nouveau prospect",
  searchPlaceholder: "Rechercher par nom, entreprise ou e-mail",
  icon: Signpost,
  service: leadsService as unknown as ResourceService,
  queryKey: QK.leads,
  statuses: LEAD_STATUSES,
  statusTones: {
    NEW: "neutral",
    CONTACTED: "wire",
    QUALIFIED: "wire",
    PROPOSAL_SENT: "amber",
    NEGOTIATION: "amber",
    WON: "signal",
    LOST: "alert",
  },
  columns: [
    { key: "lastName", label: "Nom" },
    { key: "firstName", label: "Prénom" },
    { key: "company", label: "Entreprise" },
    { key: "sector", label: "Secteur" },
    { key: "country", label: "Pays" },
    { key: "phone", label: "Téléphone" },
    { key: "value", label: "Potentiel", type: "money", align: "right" },
    // Origine : distingue un prospect saisi ici d'un prospect venu de
    // l'annuaire ou d'un import de fichier.
    { key: "source", label: "Origine" },
    { key: "status", label: "Statut", type: "status" },
  ],
  fields: [
    { key: "firstName", label: "Prénom", required: true },
    { key: "lastName", label: "Nom", required: true },
    { key: "company", label: "Entreprise" },
    { key: "jobTitle", label: "Fonction" },
    { key: "email", label: "E-mail", type: "email" },
    { key: "phone", label: "Téléphone", type: "tel" },
    { key: "sector", label: "Secteur d'activité" },
    {
      key: "country",
      label: "Pays",
      type: "lookup",
      lookup: { source: "countries" },
      placeholder: "Sélectionner un pays",
    },
    { key: "city", label: "Ville", placeholder: "Abidjan" },
    { key: "decisionMaker", label: "Décideur" },
    { key: "value", label: "Potentiel estimé (FCFA)", type: "money" },
    { key: "source", label: "Origine", type: "select", options: LEAD_SOURCES },
    { key: "status", label: "Statut", type: "select", options: LEAD_STATUSES },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  emptyTitle: "Aucun prospect",
  emptyDetail: "Créez votre premier prospect pour alimenter le pipeline commercial.",
  deleteWarning:
    "Les rendez-vous et opportunités rattachés à ce prospect seront également supprimés.",
  panels: { entityType: "LEAD", comments: true },
  toasts: { created: "Prospect créé", updated: "Prospect mis à jour", deleted: "Prospect supprimé" },
};

// ---------------------------------------------------------------------------
// Contrats (CDC §4.9)
// ---------------------------------------------------------------------------

const CONTRACT_STATUSES = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  TERMINATED: "Résilié",
  EXPIRED: "Expiré",
} as const;

export const contractsConfig: ModuleConfig = {
  title: "Contrats",
  subtitle: plural("contrat"),
  createLabel: "Nouveau contrat",
  searchPlaceholder: "Rechercher par numéro, titre ou client",
  icon: FileSignature,
  service: contractsService as unknown as ResourceService,
  queryKey: QK.contracts,
  statuses: CONTRACT_STATUSES,
  statusTones: {
    DRAFT: "neutral",
    ACTIVE: "signal",
    SUSPENDED: "amber",
    TERMINATED: "alert",
    EXPIRED: "alert",
  },
  columns: [
    { key: "number", label: "N°" },
    { key: "title", label: "Objet" },
    { key: "customer.companyName", label: "Client" },
    { key: "amount", label: "Montant", type: "money", align: "right" },
    { key: "startDate", label: "Début", type: "date" },
    { key: "endDate", label: "Fin", type: "date" },
    { key: "status", label: "Statut", type: "status" },
  ],
  fields: [
    { key: "title", label: "Objet du contrat", required: true },
    {
      key: "customerId",
      label: "Client",
      type: "reference",
      reference: { resource: "customers" },
      required: true,
    },
    { key: "amount", label: "Montant (FCFA)", type: "money", required: true },
    { key: "startDate", label: "Date de début", type: "date", required: true },
    { key: "endDate", label: "Date de fin", type: "date", hint: "Laisser vide pour une durée indéterminée." },
    { key: "description", label: "Description", type: "textarea" },
  ],
  // `status` volontairement absent des champs : `CreateContractDto` ne
  // l'accepte pas — un contrat naît en brouillon et son statut évolue par
  // les actions du cycle de vie, pas par saisie directe.
  emptyTitle: "Aucun contrat",
  emptyDetail: "Les contrats sont généralement issus d'une facture proforma acceptée.",
  deleteWarning: "Les factures rattachées à ce contrat perdront leur lien.",
  rowActions: [
    {
      path: "/contracts/:id/mark-signed",
      label: "Marquer comme signé",
      icon: "check",
      tone: "signal",
      visibleWhen: ["DRAFT"],
      confirmBody:
        "Vous confirmez avoir reçu le contrat signé par le client. Le contrat passe alors en actif.",
      successMessage: "Contrat marqué comme signé",
    },
    {
      path: "/contracts/:id/suspend",
      label: "Suspendre",
      icon: "pause",
      tone: "amber",
      visibleWhen: ["ACTIVE"],
      confirmBody:
        "Les prestations sont interrompues sans rompre l'engagement. Le contrat pourra être réactivé.",
      successMessage: "Contrat suspendu",
    },
    {
      path: "/contracts/:id/terminate",
      label: "Résilier",
      icon: "stop",
      tone: "alert",
      visibleWhen: ["ACTIVE", "SUSPENDED"],
      confirmBody:
        "La résiliation met fin à l'engagement. Les factures déjà émises restent dues.",
      successMessage: "Contrat résilié",
    },
  ],
  sendAction: {
    path: "/contracts/:id/send",
    label: "Envoyer au client",
    confirmTitle: "Envoyer le contrat au client ?",
    confirmBody:
      "Le contrat part par e-mail à l'adresse enregistrée sur la fiche client, avec le PDF en pièce jointe.",
    successMessage: "Contrat envoyé au client",
  },
  panels: {
    entityType: "CONTRACT",
    comments: true,
    signature: true,
    aiTask: "CONTRACT_BODY",
    aiTarget: "description",
  },
  toasts: { created: "Contrat créé", updated: "Contrat mis à jour", deleted: "Contrat supprimé" },
};

// ---------------------------------------------------------------------------
// Encaissements (CDC §4.11)
// ---------------------------------------------------------------------------

const PAYMENT_STATUSES = {
  PENDING: "En attente",
  PROCESSING: "En cours",
  SUCCESS: "Encaissé",
  FAILED: "Échoué",
  CANCELLED: "Annulé",
  REFUNDED: "Remboursé",
} as const;

const PAYMENT_METHODS = {
  CASH: "Espèces",
  BANK_TRANSFER: "Virement bancaire",
  CARD: "Carte bancaire",
  MOBILE_MONEY: "Mobile Money",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  MOOV_MONEY: "Moov Money",
  CINETPAY: "CinetPay",
  STRIPE: "Stripe",
  PAYPAL: "PayPal",
} as const;

export const paymentsConfig: ModuleConfig = {
  title: "Encaissements",
  subtitle: plural("encaissement"),
  createLabel: "Enregistrer un encaissement",
  searchPlaceholder: "Rechercher par référence ou client",
  icon: Wallet,
  service: paymentsService as unknown as ResourceService,
  queryKey: QK.payments,
  statuses: PAYMENT_STATUSES,
  statusTones: {
    PENDING: "neutral",
    PROCESSING: "amber",
    SUCCESS: "signal",
    FAILED: "alert",
    CANCELLED: "neutral",
    REFUNDED: "amber",
  },
  // Le CDC §7 réserve la facturation et les encaissements au Financier.
  writeRoles: ["SUPER_ADMIN", "MANAGER"],
  columns: [
    { key: "reference", label: "Référence" },
    { key: "customer.companyName", label: "Client" },
    { key: "invoice.number", label: "Facture" },
    { key: "method", label: "Moyen" },
    { key: "amount", label: "Montant", type: "money", align: "right" },
    { key: "paidAt", label: "Encaissé le", type: "date" },
    { key: "status", label: "Statut", type: "status" },
  ],
  fields: [
    {
      key: "invoiceId",
      label: "Facture",
      type: "reference",
      reference: { resource: "invoices" },
      required: true,
    },
    {
      key: "customerId",
      label: "Client",
      type: "reference",
      reference: { resource: "customers" },
      required: true,
    },
    { key: "amount", label: "Montant (FCFA)", type: "money", required: true },
    { key: "method", label: "Moyen de paiement", type: "select", options: PAYMENT_METHODS, required: true },
    { key: "status", label: "Statut", type: "select", options: PAYMENT_STATUSES },
    { key: "reference", label: "Référence du versement" },
    { key: "provider", label: "Prestataire", hint: "Wave, Orange Money, banque…" },
    { key: "paidAt", label: "Date d'encaissement", type: "date" },
  ],
  injectOnCreate: { createdById: "currentUserId" },
  emptyTitle: "Aucun encaissement",
  emptyDetail: "Les encaissements se rattachent à une facture émise.",
  toasts: {
    created: "Encaissement enregistré",
    updated: "Encaissement mis à jour",
    deleted: "Encaissement supprimé",
  },
};

// ---------------------------------------------------------------------------
// Sender ID (CDC §4.12)
// ---------------------------------------------------------------------------

const SENDER_ID_STATUSES = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
} as const;

export const senderIdConfig: ModuleConfig = {
  title: "Sender ID",
  subtitle: plural("demande"),
  createLabel: "Nouvelle demande",
  searchPlaceholder: "Rechercher par nom ou client",
  icon: Building2,
  service: senderIdService as unknown as ResourceService,
  queryKey: QK.senderIds,
  statuses: SENDER_ID_STATUSES,
  statusTones: { PENDING: "amber", APPROVED: "signal", REJECTED: "alert" },
  columns: [
    { key: "name", label: "Sender ID" },
    { key: "customer.companyName", label: "Client" },
    { key: "partner", label: "Opérateur" },
    { key: "partnerCountry", label: "Pays" },
    { key: "createdAt", label: "Demandé le", type: "date" },
    { key: "approvedAt", label: "Approuvé le", type: "date" },
    { key: "status", label: "Statut", type: "status" },
  ],
  fields: [
    { key: "name", label: "Sender ID demandé", required: true, hint: "11 caractères alphanumériques maximum." },
    {
      key: "customerId",
      label: "Client",
      type: "reference",
      reference: { resource: "customers" },
      required: true,
    },
    { key: "partner", label: "Opérateur partenaire" },
    {
      key: "partnerCountry",
      label: "Pays du partenaire",
      type: "lookup",
      lookup: { source: "countries" },
      placeholder: "Sélectionner un pays",
      // L'homologation se fait pays par pays : la même demande doit être
      // reprise auprès de chaque régulateur, et son statut peut différer.
      hint: "Le Sender ID s'homologue auprès du régulateur de chaque pays.",
    },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  // `status` retiré du formulaire : l'approbation et le rejet passent par
  // `PATCH /sender-id/:id/approve|reject`, qui horodatent la décision et
  // tracent son auteur — ce qu'une saisie libre ne ferait pas.
  emptyTitle: "Aucune demande de Sender ID",
  emptyDetail: "Les demandes sont soumises aux opérateurs pour validation.",
  toasts: { created: "Demande créée", updated: "Demande mise à jour", deleted: "Demande supprimée" },
};

// ---------------------------------------------------------------------------
// Agenda (CDC §4.13)
// ---------------------------------------------------------------------------

const ACTIVITY_TYPES = {
  CALL: "Appel",
  EMAIL: "E-mail",
  MEETING: "Rendez-vous",
  TASK: "Tâche",
  NOTE: "Note",
} as const;

const ACTIVITY_STATUSES = {
  PLANNED: "Planifié",
  IN_PROGRESS: "En cours",
  COMPLETED: "Réalisé",
  CANCELLED: "Annulé",
} as const;

export const agendaConfig: ModuleConfig = {
  title: "Agenda",
  subtitle: plural("activité"),
  createLabel: "Nouvelle activité",
  searchPlaceholder: "Rechercher par objet ou lieu",
  icon: CalendarDays,
  service: activitiesService as unknown as ResourceService,
  queryKey: QK.activities,
  statuses: ACTIVITY_STATUSES,
  statusTones: {
    PLANNED: "wire",
    IN_PROGRESS: "amber",
    COMPLETED: "signal",
    CANCELLED: "alert",
  },
  columns: [
    { key: "title", label: "Objet" },
    { key: "type", label: "Type" },
    { key: "customer.companyName", label: "Client" },
    { key: "location", label: "Lieu" },
    { key: "dueDate", label: "Échéance", type: "date" },
    { key: "status", label: "Statut", type: "status" },
  ],
  fields: [
    { key: "title", label: "Objet", required: true },
    { key: "type", label: "Type", type: "select", options: ACTIVITY_TYPES, required: true },
    { key: "dueDate", label: "Date", type: "date" },
    { key: "location", label: "Lieu" },
    {
      key: "customerId",
      label: "Client",
      type: "reference",
      reference: { resource: "customers" },
    },
    { key: "status", label: "Statut", type: "select", options: ACTIVITY_STATUSES },
    {
      key: "description",
      label: "Description",
      type: "textarea",
      // Exigée pour un rendez-vous seulement (demande du 07/08). Le serveur
      // applique la même règle : celle-ci évite juste un aller-retour.
      requiredWhen: { field: "type", equals: ["MEETING"] },
      // Le DTO impose `@MinLength(10)` : le rappeler ici évite un aller-retour
      // et affiche le compteur à la saisie.
      minLength: 10,
      placeholder: "Objet du rendez-vous, interlocuteur, points à aborder…",
      hint: "Obligatoire pour un rendez-vous — une phrase au moins.",
    },
  ],
  // `CreateActivityDto` exige `assignedToId` sans que ce soit une question à
  // poser : on planifie son propre agenda.
  injectOnCreate: { assignedToId: "currentUserId" },
  // L'annulation d'un rendez-vous exige un motif saisi : elle passe par sa
  // propre modale (`CancelActivityModal`), pas par une action de ligne.
  emptyTitle: "Aucune activité planifiée",
  emptyDetail: "Planifiez vos rendez-vous, appels et relances depuis cet écran.",
  toasts: {
    created: "Activité planifiée",
    updated: "Activité mise à jour",
    deleted: "Activité supprimée",
  },
};

// ---------------------------------------------------------------------------
// Documents (CDC §4.14) — dépôt via le module GED, consultation ici
// ---------------------------------------------------------------------------

const DOCUMENT_TYPES = {
  CONTRACT: "Contrat",
  INVOICE: "Facture",
  QUOTE: "Factures proforma",
  PURCHASE_ORDER: "Bon de commande",
  IMAGE: "Image",
  PDF: "PDF",
  WORD: "Word",
  EXCEL: "Excel",
  OTHER: "Autre",
} as const;

export const documentsConfig: ModuleConfig = {
  title: "Documents",
  subtitle: plural("document"),
  createLabel: "Déposer un document",
  searchPlaceholder: "Rechercher par nom de document",
  icon: FolderOpen,
  service: documentsService as unknown as ResourceService,
  queryKey: QK.documents,
  statuses: DOCUMENT_TYPES,
  statusFilterKey: "type",
  columns: [
    { key: "name", label: "Nom" },
    { key: "type", label: "Type", type: "status" },
    { key: "customer.companyName", label: "Client" },
    { key: "uploadedBy.firstName", label: "Déposé par" },
    { key: "createdAt", label: "Déposé le", type: "date" },
    { key: "size", label: "Taille", align: "right" },
  ],
  // Le dépôt passe par `POST /documents/upload` en multipart : il ne rentre
  // pas dans le formulaire générique, d'où la lecture seule ici.
  fields: [],
  readOnly: true,
  statsPanel: { path: "/documents/:id/stats" },
  // Aperçu dans un onglet, ou enregistrement sous le nom du document.
  fileActions: { pathKey: "path", nameKey: "fileName" },
  uploadAction: { label: "Déposer un document" },
  emptyTitle: "Aucun document",
  emptyDetail: "Les documents déposés depuis les fiches client apparaîtront ici.",
};

// ---------------------------------------------------------------------------
// Journal d'audit (CDC §4.16)
// ---------------------------------------------------------------------------

export const auditConfig: ModuleConfig = {
  title: "Journal d'audit",
  subtitle: plural("entrée"),
  createLabel: "",
  searchPlaceholder: "Rechercher par entité ou action",
  icon: ShieldCheck,
  service: auditService as unknown as ResourceService,
  queryKey: QK.audit,
  columns: [
    { key: "createdAt", label: "Horodatage", type: "date" },
    { key: "user.firstName", label: "Utilisateur" },
    { key: "action", label: "Action" },
    { key: "entity", label: "Entité" },
    { key: "description", label: "Détail" },
    { key: "ipAddress", label: "Adresse IP" },
  ],
  fields: [],
  readOnly: true,
  writeRoles: ["SUPER_ADMIN"],
  emptyTitle: "Journal vide",
  emptyDetail: "Les actions sensibles seront tracées ici au fil de l'utilisation.",
};

// ---------------------------------------------------------------------------

export const MODULE_CONFIGS = {
  prospects: prospectsConfig,
  contrats: contractsConfig,
  encaissements: paymentsConfig,
  senderId: senderIdConfig,
  agenda: agendaConfig,
  documents: documentsConfig,
  audit: auditConfig,
} satisfies Record<string, ModuleConfig>;

export { ScrollText };
