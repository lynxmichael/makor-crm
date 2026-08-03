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
  | "status";

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
}
