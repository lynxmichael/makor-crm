import { ModuleListPage } from "./ModuleListPage";
import { mockClients, countries, sectors } from "@/data/mock";
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

const contactChannels = ["Appel téléphonique", "Email", "WhatsApp", "LinkedIn", "Recommandation", "Autre"];
const prospectStatuses = ["Nouveau", "Ouvert", "Converti", "Perdu"];

export const ProspectsPage = page({
  title: "Prospects",
  description: "Base de contacts de prospection — secteur, décideur et canal d'acquisition",
  actionLabel: "Nouveau prospect",
  statusKey: "statut",
  defaultStatus: "Nouveau",
  columns: [
    { key: "nom", label: "Entreprise" },
    { key: "secteur", label: "Secteur" },
    { key: "contactPersonne", label: "Personne contact" },
    { key: "position", label: "Position" },
    { key: "canal", label: "Canal de contact" },
    { key: "coordonnees", label: "Contacts" },
    { key: "commercial", label: "Commercial" },
    { key: "statut", label: "Statut" },
  ],
  fields: [
    { key: "nom", label: "Nom de l'entreprise", placeholder: "Ex. Sunu Assurances" },
    { key: "secteur", label: "Secteur d'activité", type: "select", options: sectors },
    { key: "contactPersonne", label: "Personne contact", placeholder: "Ex. M. Diagne" },
    { key: "position", label: "Position", placeholder: "Ex. Directeur Général" },
    { key: "canal", label: "Canal de contact", type: "select", options: contactChannels },
    { key: "coordonnees", label: "Contacts (téléphone / e-mail)", placeholder: "Ex. +221 77 512 90 21" },
    { key: "commercial", label: "Commercial assigné", type: "select", options: team },
    { key: "statut", label: "Statut", type: "select", options: prospectStatuses },
  ],
  initialRows: [
    { nom: "Sunu Assurances", secteur: "Assurance", contactPersonne: "M. Diagne", position: "Directeur Général", canal: "Recommandation", coordonnees: "m.diagne@sunu-assurances.sn", commercial: "Moussa Traoré", statut: "Ouvert" },
    { nom: "Bank of Africa CI", secteur: "Banque & Finance", contactPersonne: "Mme Coulibaly", position: "DSI", canal: "LinkedIn", coordonnees: "a.coulibaly@boaci.ci", commercial: "Aïcha Koné", statut: "Ouvert" },
    { nom: "Groupe Bernabé", secteur: "Grande distribution", contactPersonne: "M. Bernard", position: "Directeur Général", canal: "Appel téléphonique", coordonnees: "+225 07 22 45 61 09", commercial: "Sarah Bamba", statut: "Nouveau" },
    { nom: "Clinique Farah", secteur: "Santé", contactPersonne: "Dr Aminata Touré", position: "Directrice médicale", canal: "Email", coordonnees: "a.toure@clinique-farah.sn", commercial: "Sarah Bamba", statut: "Converti" },
    { nom: "Lycée Blaise Diagne", secteur: "Éducation", contactPersonne: "M. Faye", position: "Intendant", canal: "Autre", coordonnees: "intendance@lbd.sn", commercial: "Moussa Traoré", statut: "Perdu" },
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

const paymentModes = ["Virement bancaire", "Mobile Money", "Chèque", "Espèces"];

export const PurchaseOrdersPage = page({
  title: "Bons de commande",
  description: "Suivi des offres émises — génération, envoi et signature",
  actionLabel: "Générer un BC",
  statusKey: "statut",
  defaultStatus: "Envoyé",
  refPrefix: "BC-2607",
  columns: [
    { key: "ref", label: "Numéro BC", mono: true },
    { key: "date", label: "Date" },
    { key: "produit", label: "Produit" },
    { key: "idProduit", label: "ID produit", mono: true },
    { key: "client", label: "Client / Prospect" },
    { key: "secteur", label: "Secteur d'activité" },
    { key: "valeur", label: "Valeur BC (HT)", align: "right", mono: true },
    { key: "modeReglement", label: "Mode de règlmt proposé" },
    { key: "statut", label: "Statut" },
    { key: "commercial", label: "Commercial" },
  ],
  fields: [
    { key: "date", label: "Date", type: "date" },
    { key: "produit", label: "Produit", type: "select", options: products },
    { key: "idProduit", label: "ID produit", placeholder: "Ex. PRD-API-002" },
    { key: "client", label: "Client / Prospect", type: "select", options: clientNames },
    { key: "secteur", label: "Secteur d'activité", type: "select", options: sectors },
    { key: "valeur", label: "Valeur BC HT (FCFA)", placeholder: "Ex. 8 000 000" },
    { key: "modeReglement", label: "Mode de règlement proposé", type: "select", options: paymentModes },
    { key: "commercial", label: "Commercial", type: "select", options: team },
  ],
  initialRows: [
    { ref: "BC-2607-041", date: "09 juil. 2026", produit: "API SMS", idProduit: "PRD-API-002", client: "SGCI", secteur: "Banque & Finance", valeur: "12 300 000", modeReglement: "Virement bancaire", statut: "Signé", commercial: "Sarah Bamba" },
    { ref: "BC-2607-040", date: "08 juil. 2026", produit: "Voice", idProduit: "PRD-VOX-005", client: "Sonatel", secteur: "Énergie", valeur: "9 600 000", modeReglement: "Virement bancaire", statut: "Envoyé", commercial: "Moussa Traoré" },
    { ref: "BC-2607-039", date: "05 juil. 2026", produit: "API SMS", idProduit: "PRD-API-002", client: "Ecobank CI", secteur: "Banque & Finance", valeur: "15 000 000", modeReglement: "Virement bancaire", statut: "Signé", commercial: "Aïcha Koné" },
    { ref: "BC-2607-038", date: "02 juil. 2026", produit: "SMS Marketing", idProduit: "PRD-SMS-001", client: "Carrefour Sénégal", secteur: "Grande distribution", valeur: "6 100 000", modeReglement: "Mobile Money", statut: "Signé", commercial: "Moussa Traoré" },
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
  description: "Suivi des règlements et rapprochement avec les bons de commande",
  actionLabel: "Enregistrer un règlement",
  columns: [
    { key: "client", label: "Client / Prospect" },
    { key: "secteur", label: "Secteur d'activité" },
    { key: "produit", label: "Produit" },
    { key: "numeroBC", label: "Numéro BC", mono: true },
    { key: "valeurBC", label: "Valeur BC", align: "right", mono: true },
    { key: "commercial", label: "Commercial" },
    { key: "montant", label: "Montant réglé", align: "right", mono: true },
    { key: "date", label: "Date de règlement" },
    { key: "canal", label: "Canal de règlement" },
    { key: "commentaires", label: "Commentaires" },
  ],
  fields: [
    { key: "client", label: "Client / Prospect", type: "select", options: clientNames },
    { key: "secteur", label: "Secteur d'activité", type: "select", options: sectors },
    { key: "produit", label: "Produit", type: "select", options: products },
    { key: "numeroBC", label: "Numéro BC", placeholder: "Ex. BC-2607-041" },
    { key: "valeurBC", label: "Valeur BC (FCFA)", placeholder: "Ex. 12 300 000" },
    { key: "commercial", label: "Commercial", type: "select", options: team },
    { key: "montant", label: "Montant réglé (FCFA)", placeholder: "Ex. 3 000 000" },
    { key: "date", label: "Date de règlement", type: "date" },
    { key: "canal", label: "Canal de règlement", type: "select", options: paymentModes },
    { key: "commentaires", label: "Commentaires", placeholder: "Optionnel" },
  ],
  initialRows: [
    { client: "SGCI", secteur: "Banque & Finance", produit: "API SMS", numeroBC: "BC-2607-041", valeurBC: "12 300 000", commercial: "Sarah Bamba", montant: "12 300 000", date: "17 juil. 2026", canal: "Virement bancaire", commentaires: "Paiement intégral à la commande" },
    { client: "Ecobank CI", secteur: "Banque & Finance", produit: "API SMS", numeroBC: "BC-2607-039", valeurBC: "15 000 000", commercial: "Aïcha Koné", montant: "5 000 000", date: "06 juil. 2026", canal: "Virement bancaire", commentaires: "Acompte 1/3 à la signature" },
    { client: "Carrefour Sénégal", secteur: "Grande distribution", produit: "SMS Marketing", numeroBC: "BC-2607-038", valeurBC: "6 100 000", commercial: "Moussa Traoré", montant: "6 100 000", date: "30 juin 2026", canal: "Mobile Money", commentaires: "Paiement intégral" },
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
