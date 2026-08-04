import type { LucideIcon } from "lucide-react";
import type { Paginated } from "@/types/api";

export type Row = Record<string, unknown> & { id?: unknown };

/** Types de rendu et de saisie reconnus par la page générique. */
export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "date"
  | "email"
  | "tel"
  | "url"
  | "select"
  | "status"
  /** Renvoi vers une autre fiche : rendu par un sélecteur de recherche. */
  | "reference";

export interface ModuleField {
  key: string;
  label: string;
  type?: FieldType;
  align?: "left" | "right";
  /** Pour les champs de type select : valeur → libellé. */
  options?: Record<string, string>;
  required?: boolean;
  placeholder?: string;
  hint?: string;

  /**
   * Pour un champ de type `reference` : ressource cible et affichage d'une
   * option. Saisir un identifiant à la main est intenable — un cuid ne
   * s'apprend pas, et une valeur inventée fait échouer la requête en P2025
   * plutôt qu'en erreur de validation lisible.
   */
  reference?: {
    resource: "customers" | "invoices" | "contracts" | "products" | "users" | "deals" | "leads";
  };
}

/** Contrat minimal attendu d'un service produit par `createResource`. */
export interface ResourceService {
  list: (params?: Record<string, unknown>) => Promise<Paginated<Row>>;
  get: (id: string) => Promise<Row>;
  create: (body: Record<string, unknown>) => Promise<Row>;
  update: (id: string, body: Record<string, unknown>) => Promise<Row>;
  remove: (id: string) => Promise<unknown>;
}

export type Tone = "neutral" | "signal" | "amber" | "alert" | "wire";

export interface ModuleConfig {
  title: string;
  /** Sous-titre calculé, pour accorder au nombre d'éléments. */
  subtitle: (total: number) => string;
  createLabel: string;
  searchPlaceholder: string;
  icon?: LucideIcon;

  service: ResourceService;
  queryKey: readonly string[];

  columns: ModuleField[];
  /** Champs du formulaire. Vide pour un module en lecture seule. */
  fields: ModuleField[];

  statuses?: Record<string, string>;
  statusTones?: Record<string, Tone>;
  /** Nom du paramètre de filtre, quand ce n'est pas « status ». */
  statusFilterKey?: string;
  extraParams?: Record<string, unknown>;

  emptyTitle: string;
  emptyDetail: string;
  deleteWarning?: string;

  /** Journal d'audit, notamment : consultable, jamais modifiable. */
  readOnly?: boolean;
  /** Restreint l'écriture à certains rôles, en écho du CDC §7. */
  writeRoles?: string[];

  toasts?: { created?: string; updated?: string; deleted?: string };

  /**
   * Champs injectés automatiquement à la création, non exposés au
   * formulaire — typiquement l'utilisateur connecté quand le DTO l'exige.
   * `currentUserId` est la seule valeur reconnue pour l'instant.
   */
  injectOnCreate?: Record<string, "currentUserId">;

  /**
   * Panneaux transverses affichés sous le formulaire, en modification
   * seulement : ils portent tous sur une fiche déjà enregistrée.
   *
   * `entityType` doit correspondre à l'enum `CommentEntity` du backend, et
   * `signature` n'est valable que pour les trois valeurs de `SignableEntity`.
   */
  /**
   * Action d'envoi au client, quand le module en expose une. La page
   * générique n'a pas d'actions métier : celle-ci est déclarée plutôt que
   * codée en dur, pour rester lisible depuis la configuration.
   */
  sendAction?: {
    /** Chemin relatif, `:id` remplacé à l'appel. */
    path: string;
    label: string;
    confirmTitle: string;
    confirmBody: string;
    successMessage: string;
  };

  /**
   * Actions de cycle de vie proposées sur une ligne, au-delà de l'envoi.
   * `visibleWhen` limite l'action aux statuts où elle a un sens — proposer
   * « résilier » sur un contrat déjà résilié n'apporte rien.
   */
  rowActions?: {
    path: string;
    method?: "post" | "patch";
    label: string;
    icon?: "check" | "pause" | "stop";
    tone?: "signal" | "amber" | "alert";
    visibleWhen?: string[];
    confirmBody: string;
    successMessage: string;
  }[];

  /** Affiche un panneau de statistiques par ligne (documents). */
  statsPanel?: { path: string };

  panels?: {
    entityType: string;
    comments?: boolean;
    signature?: boolean;
    /** Tâche de rédaction assistée proposée sur la fiche. */
    aiTask?: string;
    /** Champ du formulaire qui reçoit le texte retenu. */
    aiTarget?: string;
  };
}
