import { Construction } from "lucide-react";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  /** Étape de la trajectoire qui livrera ce module. */
  step: string;
}

/**
 * Module non encore construit.
 *
 * Dit franchement ce qui manque et quand cela arrive, plutôt que d'afficher
 * un écran rempli de chiffres inventés — un tableau plausible mais faux se
 * prend pour une donnée réelle en réunion.
 */
export function ModulePlaceholder({ title, description, step }: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-text">{title}</h1>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </header>

      <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
        <Construction className="h-7 w-7 text-primary" />
        <p className="font-display text-base font-bold text-text">Module à venir</p>
        <p className="max-w-md text-sm text-muted">
          L'étape 1 a posé les fondations : authentification, rôles et navigation.
          Cet écran est livré à l'{step}.
        </p>
      </div>
    </div>
  );
}

export function DealsChainPage() {
  return (
    <ModulePlaceholder
      title="Devis · Bons de commande · Contrats"
      description="Chaîne commerciale complète, sans ressaisie d'une étape à l'autre"
      step="étape 3"
    />
  );
}

export function ExpensesPage() {
  return (
    <ModulePlaceholder
      title="Notes de frais"
      description="Frais engagés, validation et remboursement"
      step="étape 4"
    />
  );
}

export function TeamPage() {
  return (
    <ModulePlaceholder
      title="Équipe"
      description="Composition de l'équipe commerciale et évaluation"
      step="étape 4"
    />
  );
}

export function ResourcesPage() {
  return (
    <ModulePlaceholder
      title="Ressources"
      description="Documentation produit et parcours de formation"
      step="étape 4"
    />
  );
}

export function ProductsPage() {
  return (
    <ModulePlaceholder
      title="Produits"
      description="Catalogue et grille tarifaire par produit, pays et secteur"
      step="étape 4"
    />
  );
}

/** Messagerie interne : repoussée en V2 par D3, pas un simple retard. */
export function MessagingPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-text">Messagerie</h1>
        <p className="mt-1 text-sm text-muted">Échanges internes entre collaborateurs</p>
      </header>

      <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-dark">
          Version 2
        </span>
        <p className="font-display text-base font-bold text-text">
          Hors périmètre de la version 1
        </p>
        <p className="max-w-md text-sm text-muted">
          La messagerie interne est repoussée en V2 (décision D3). En V1, seul l'envoi
          d'un document par e-mail depuis une fiche client est prévu.
        </p>
      </div>
    </div>
  );
}
