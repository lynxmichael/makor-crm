import { ModuleListPage } from "./ModuleListPage";
import { mockClients, countries } from "@/data/mock";
import { csvExportAction } from "@/lib/utils";
import type { ModuleColumn, ModuleRow } from "@/types";
import type { FieldDef } from "@/components/shared/EntityFormModal";

const clientNames = mockClients.map((c) => c.name);
const products = ["SMS Marketing", "OTP", "API SMS", "WhatsApp", "Voice", "Sender ID"];
const team = ["Aïcha Koné", "Moussa Traoré", "Sarah Bamba"];

function page(config: {
  title: string;
  description: string;
  actionLabel?: string;
  columns: ModuleColumn[];
  initialRows: ModuleRow[];
  statusKey?: string;
  defaultStatus?: string;
  refPrefix?: string;
  fields?: FieldDef[];
  onAction?: (rows: ModuleRow[], columns: ModuleColumn[]) => void;
}) {
  return function Page() {
    return <ModuleListPage {...config} />;
  };
}

export const ProspectsPage = page({
  title: "Prospects",
  description: "Qualification, secteur d'activité, décideur et source d'acquisition",
  actionLabel: "Nouveau prospect",
  statusKey: "statut",
  defaultStatus: "Ouvert",
  columns: [
    { key: "nom", label: "Prospect" },
    { key: "secteur", label: "Secteur" },
    { key: "decideur", label: "Décideur" },
    { key: "source", label: "Source" },
    { key: "commercial", label: "Commercial" },
    { key: "statut", label: "Statut" },
  ],
  fields: [
    { key: "nom", label: "Nom du prospect", placeholder: "Ex. Sunu Assurances" },
    { key: "secteur", label: "Secteur d'activité", type: "select", options: ["Banque & Finance", "Assurance", "Grande distribution", "Santé", "Éducation", "Transport & Logistique", "Énergie"] },
    { key: "decideur", label: "Décideur", placeholder: "Ex. M. Diagne, DG" },
    { key: "source", label: "Source", type: "select", options: ["Salon", "Site web", "Recommandation", "Réseaux sociaux", "Autre"] },
    { key: "commercial", label: "Commercial assigné", type: "select", options: team },
  ],
  initialRows: [
    { nom: "Sunu Assurances", secteur: "Assurance", decideur: "M. Diagne, DG", source: "Salon Telecom Expo", commercial: "Moussa Traoré", statut: "Ouvert" },
    { nom: "Bank of Africa CI", secteur: "Banque & Finance", decideur: "Mme Coulibaly, DSI", source: "Recommandation", commercial: "Aïcha Koné", statut: "Ouvert" },
    { nom: "Groupe Bernabé", secteur: "Grande distribution", decideur: "M. Bernard, DG", source: "Site web", commercial: "Sarah Bamba", statut: "Ouvert" },
  ],
});

export const QuotesPage = page({
  title: "Devis",
  description: "Propositions commerciales chiffrées à partir du catalogue produits",
  actionLabel: "Nouveau devis",
  statusKey: "statut",
  defaultStatus: "En attente",
  refPrefix: "DEV-2607",
  columns: [
    { key: "ref", label: "Référence", mono: true },
    { key: "client", label: "Client" },
    { key: "produit", label: "Produit" },
    { key: "montant", label: "Montant", align: "right", mono: true },
    { key: "statut", label: "Statut" },
  ],
  fields: [
    { key: "client", label: "Client", type: "select", options: clientNames },
    { key: "produit", label: "Produit", type: "select", options: products },
    { key: "montant", label: "Montant", placeholder: "Ex. 5 000 000 FCFA" },
  ],
  initialRows: [
    { ref: "DEV-2607-014", client: "SGCI", produit: "API SMS", montant: "12 300 000 FCFA", statut: "Envoyé" },
    { ref: "DEV-2607-013", client: "Sonatel", produit: "Voice", montant: "9 600 000 FCFA", statut: "En attente" },
    { ref: "DEV-2607-012", client: "Prosuma", produit: "OTP", montant: "7 800 000 FCFA", statut: "Signé" },
  ],
});

export const PurchaseOrdersPage = page({
  title: "Bons de commande",
  description: "Génération PDF, envoi par e-mail et suivi de signature",
  actionLabel: "Générer un BC",
  statusKey: "statut",
  defaultStatus: "Envoyé",
  refPrefix: "BC-2607",
  columns: [
    { key: "ref", label: "Référence", mono: true },
    { key: "client", label: "Client" },
    { key: "valeur", label: "Valeur FCFA", align: "right", mono: true },
    { key: "date", label: "Date d'envoi" },
    { key: "statut", label: "Statut" },
  ],
  fields: [
    { key: "client", label: "Client", type: "select", options: clientNames },
    { key: "valeur", label: "Valeur (FCFA)", placeholder: "Ex. 8 000 000" },
    { key: "date", label: "Date d'envoi", type: "date" },
  ],
  initialRows: [
    { ref: "BC-2607-041", client: "SGCI", valeur: "12 300 000", date: "09 juil. 2026", statut: "Signé" },
    { ref: "BC-2607-040", client: "Sonatel", valeur: "9 600 000", date: "08 juil. 2026", statut: "Envoyé" },
    { ref: "BC-2607-039", client: "Ecobank CI", valeur: "15 000 000", date: "05 juil. 2026", statut: "Signé" },
  ],
});

export const ContractsPage = page({
  title: "Contrats",
  description: "Contrats formalisés à partir des bons de commande signés",
  actionLabel: "Nouveau contrat",
  statusKey: "statut",
  defaultStatus: "Actif",
  refPrefix: "CTR-2026",
  columns: [
    { key: "ref", label: "Référence", mono: true },
    { key: "client", label: "Client" },
    { key: "produit", label: "Produit" },
    { key: "signature", label: "Date de signature" },
    { key: "statut", label: "Statut" },
  ],
  fields: [
    { key: "client", label: "Client", type: "select", options: clientNames },
    { key: "produit", label: "Produit", type: "select", options: products },
    { key: "signature", label: "Date de signature", type: "date" },
  ],
  initialRows: [
    { ref: "CTR-2026-118", client: "Ecobank CI", produit: "API SMS", signature: "05 juil. 2026", statut: "Actif" },
    { ref: "CTR-2026-117", client: "NSIA Assurances", produit: "WhatsApp", signature: "03 juil. 2026", statut: "Actif" },
    { ref: "CTR-2026-116", client: "CIE", produit: "OTP", signature: "20 juin 2026", statut: "Actif" },
  ],
});

export const InvoicingPage = page({
  title: "Facturation",
  description: "Factures envoyées aux clients",
  actionLabel: "Émettre une facture",
  statusKey: "statut",
  defaultStatus: "En attente",
  refPrefix: "FAC-2607",
  columns: [
    { key: "ref", label: "Référence", mono: true },
    { key: "client", label: "Client" },
    { key: "montant", label: "Montant", align: "right", mono: true },
    { key: "echeance", label: "Échéance" },
    { key: "statut", label: "Statut" },
  ],
  fields: [
    { key: "client", label: "Client", type: "select", options: clientNames },
    { key: "montant", label: "Montant", placeholder: "Ex. 6 000 000 FCFA" },
    { key: "echeance", label: "Échéance", type: "date" },
  ],
  initialRows: [
    { ref: "FAC-2607-231", client: "CIE", montant: "21 400 000 FCFA", echeance: "31 juil. 2026", statut: "Payée" },
    { ref: "FAC-2607-230", client: "Carrefour Sénégal", montant: "6 100 000 FCFA", echeance: "28 juil. 2026", statut: "En attente" },
    { ref: "FAC-2607-229", client: "Orange Bank Togo", montant: "380 000 FCFA", echeance: "10 juil. 2026", statut: "En retard" },
  ],
});

export const PaymentsPage = page({
  title: "Encaissements",
  description: "Règlements reçus et rapprochement avec les factures",
  actionLabel: "Enregistrer un encaissement",
  columns: [
    { key: "date", label: "Date" },
    { key: "client", label: "Client" },
    { key: "mode", label: "Mode" },
    { key: "montant", label: "Montant", align: "right", mono: true },
    { key: "facture", label: "Facture liée", mono: true },
  ],
  fields: [
    { key: "date", label: "Date", type: "date" },
    { key: "client", label: "Client", type: "select", options: clientNames },
    { key: "mode", label: "Mode de paiement", type: "select", options: ["Virement", "Mobile Money", "Chèque", "Espèces"] },
    { key: "montant", label: "Montant", placeholder: "Ex. 3 000 000 FCFA" },
    { key: "facture", label: "Facture liée", placeholder: "Ex. FAC-2607-231" },
  ],
  initialRows: [
    { date: "17 juil. 2026", client: "CIE", mode: "Virement", montant: "21 400 000 FCFA", facture: "FAC-2607-231" },
    { date: "12 juil. 2026", client: "Ecobank CI", mode: "Mobile Money", montant: "15 000 000 FCFA", facture: "FAC-2607-224" },
    { date: "02 juil. 2026", client: "NSIA Assurances", mode: "Chèque", montant: "4 800 000 FCFA", facture: "FAC-2607-219" },
  ],
});

export const SenderIdPage = page({
  title: "Sender ID",
  description: "Demandes d'identifiant expéditeur pour un partenaire",
  actionLabel: "Nouvelle demande",
  statusKey: "statut",
  defaultStatus: "En attente",
  columns: [
    { key: "id", label: "Sender ID", mono: true },
    { key: "partenaire", label: "Partenaire" },
    { key: "pays", label: "Pays" },
    { key: "demande", label: "Date de demande" },
    { key: "statut", label: "Statut" },
  ],
  fields: [
    { key: "id", label: "Sender ID souhaité", placeholder: "Ex. ECOBANK" },
    { key: "partenaire", label: "Partenaire", type: "select", options: clientNames },
    { key: "pays", label: "Pays", type: "select", options: countries },
    { key: "demande", label: "Date de demande", type: "date" },
  ],
  initialRows: [
    { id: "ECOBANK", partenaire: "Ecobank CI", pays: "Côte d'Ivoire", demande: "01 juil. 2026", statut: "Actif" },
    { id: "NSIA-ASSUR", partenaire: "NSIA Assurances", pays: "Côte d'Ivoire", demande: "28 juin 2026", statut: "En attente" },
    { id: "CARREFOUR", partenaire: "Carrefour Sénégal", pays: "Sénégal", demande: "15 juin 2026", statut: "Actif" },
  ],
});

export const AgendaPage = page({
  title: "Agenda",
  description: "Rendez-vous commerciaux et rappels",
  actionLabel: "Planifier un RDV",
  columns: [
    { key: "date", label: "Date" },
    { key: "heure", label: "Heure" },
    { key: "client", label: "Client" },
    { key: "objet", label: "Objet" },
    { key: "commercial", label: "Commercial" },
  ],
  fields: [
    { key: "date", label: "Date", type: "date" },
    { key: "heure", label: "Heure", placeholder: "Ex. 10:00" },
    { key: "client", label: "Client", type: "select", options: clientNames },
    { key: "objet", label: "Objet du rendez-vous", placeholder: "Ex. Présentation OTP" },
    { key: "commercial", label: "Commercial", type: "select", options: team },
  ],
  initialRows: [
    { date: "18 juil. 2026", heure: "09:30", client: "Bank of Africa CI", objet: "Présentation OTP", commercial: "Aïcha Koné" },
    { date: "18 juil. 2026", heure: "14:00", client: "Total Énergies CI", objet: "Suivi proposition API SMS", commercial: "Aïcha Koné" },
    { date: "21 juil. 2026", heure: "11:00", client: "Sunu Assurances", objet: "Découverte besoin", commercial: "Moussa Traoré" },
  ],
});

export const DocumentsPage = page({
  title: "Documents",
  description: "Gestion électronique des documents — contrats, devis, pièces jointes",
  actionLabel: "Téléverser un document",
  columns: [
    { key: "nom", label: "Document" },
    { key: "type", label: "Type" },
    { key: "entite", label: "Fiche liée" },
    { key: "date", label: "Ajouté le" },
  ],
  fields: [
    { key: "nom", label: "Nom du fichier", placeholder: "Ex. contrat-signe.pdf" },
    { key: "type", label: "Type", type: "select", options: ["Contrat signé", "Bon de commande", "Pièce KYC", "Devis", "Autre"] },
    { key: "entite", label: "Fiche liée", type: "select", options: clientNames },
    { key: "date", label: "Ajouté le", type: "date" },
  ],
  initialRows: [
    { nom: "CTR-2026-118-signe.pdf", type: "Contrat signé", entite: "Ecobank CI", date: "05 juil. 2026" },
    { nom: "BC-2607-041.pdf", type: "Bon de commande", entite: "SGCI", date: "09 juil. 2026" },
    { nom: "KYC-piece-identite.pdf", type: "Pièce KYC", entite: "Prosuma", date: "02 juil. 2026" },
  ],
});

const reportsColumns: ModuleColumn[] = [
  { key: "rapport", label: "Rapport" },
  { key: "perimetre", label: "Périmètre" },
  { key: "genere", label: "Généré le" },
  { key: "format", label: "Format" },
];
const reportsRows: ModuleRow[] = [
  { rapport: "Volumes & marges — juin 2026", perimetre: "Tous produits · Tous pays", genere: "01 juil. 2026", format: "Excel" },
  { rapport: "Qualité du pipeline — S2 juin", perimetre: "Par produit, par pays", genere: "01 juil. 2026", format: "PDF" },
  { rapport: "Ventes par commercial — juin 2026", perimetre: "Équipe commerciale", genere: "01 juil. 2026", format: "CSV" },
];

export const ReportsPage = page({
  title: "Rapports",
  description: "Volumes, chiffre d'affaires et marges — le bouton exporte la vue actuelle en CSV",
  actionLabel: "Exporter (CSV)",
  columns: reportsColumns,
  initialRows: reportsRows,
  onAction: csvExportAction("rapports-makor-crm.csv"),
});

export const AuditPage = page({
  title: "Audit",
  description: "Journal des actions sensibles — généré automatiquement, réservé au Super Admin",
  columns: [
    { key: "date", label: "Date" },
    { key: "utilisateur", label: "Utilisateur" },
    { key: "action", label: "Action" },
    { key: "entite", label: "Entité concernée" },
  ],
  initialRows: [
    { date: "18 juil. 2026 · 08:42", utilisateur: "Aïcha Koné", action: "Modification de bon de commande", entite: "BC-2607-041" },
    { date: "17 juil. 2026 · 17:05", utilisateur: "Manager", action: "Enregistrement d'encaissement", entite: "FAC-2607-231" },
    { date: "17 juil. 2026 · 10:12", utilisateur: "Super Admin", action: "Création d'utilisateur", entite: "s.bamba@makorgroup.com" },
  ],
});

export const SettingsPage = page({
  title: "Paramètres",
  description: "Produits, secteurs, pays, TVA et devises",
  actionLabel: "Ajouter un paramètre",
  columns: [
    { key: "categorie", label: "Catégorie" },
    { key: "valeur", label: "Valeur" },
    { key: "detail", label: "Détail" },
  ],
  fields: [
    { key: "categorie", label: "Catégorie", type: "select", options: ["Produit", "Pays", "Secteur", "Devise", "TVA"] },
    { key: "valeur", label: "Valeur", placeholder: "Ex. WhatsApp" },
    { key: "detail", label: "Détail", placeholder: "Ex. Tarif variable par pays" },
  ],
  initialRows: [
    { categorie: "Produit", valeur: "SMS Marketing", detail: "Tarif variable par pays" },
    { categorie: "Pays", valeur: "Côte d'Ivoire", detail: "TVA 18 %" },
    { categorie: "Devise", valeur: "FCFA", detail: "Devise de référence" },
  ],
});
