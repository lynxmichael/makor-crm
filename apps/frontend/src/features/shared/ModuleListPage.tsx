import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, Plus, Search, Trash2 } from "lucide-react";
import type { QueryKey } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { EntityFormModal, type FieldDef } from "@/components/shared/EntityFormModal";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/DataState";
import type { ModuleColumn, ModuleRow } from "@/types";
import type { ApiError } from "@/types/api";
import type { Resource } from "@/services/resources";
import { useResourceList, useResourceMutations } from "@/hooks/use-resource";
import { useDebounced } from "@/hooks/use-debounced";
import { cn, generateRef } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/motion";

const badgeTones: Record<string, "neutral" | "signal" | "amber" | "alert" | "wire"> = {
  Signé: "signal",
  SIGNED: "signal",
  Actif: "signal",
  ACTIVE: "signal",
  Payée: "signal",
  PAID: "signal",
  Résolu: "signal",
  Converti: "signal",
  CONVERTED: "signal",
  APPROVED: "signal",
  Envoyé: "wire",
  SENT: "wire",
  Nouveau: "wire",
  NEW: "wire",
  DRAFT: "wire",
  "RDV programmé": "wire",
  "RDV réalisé": "wire",
  "En attente": "amber",
  PENDING: "amber",
  Ouvert: "amber",
  "Présentation faite": "amber",
  "Offre envoyée": "amber",
  "En retard": "alert",
  OVERDUE: "alert",
  Perdu: "alert",
  LOST: "alert",
  REJECTED: "alert",
  CANCELLED: "alert",
};

interface ModuleListPageProps {
  title: string;
  description: string;
  actionLabel?: string;
  columns: ModuleColumn[];
  statusKey?: string;
  defaultStatus?: string;
  refPrefix?: string;
  fields?: FieldDef[];

  /**
   * Branchement API. Quand `resource` est fourni, la page lit et écrit sur
   * le backend ; sinon elle retombe sur `initialRows` en mémoire, ce qui
   * laisse les écrans pas encore migrés fonctionner comme avant.
   */
  resource?: Resource<Record<string, any>>;
  queryKey?: QueryKey;
  /** Transforme une entité de l'API en ligne affichable. */
  mapRow?: (row: Record<string, any>) => ModuleRow;
  /** Transforme les valeurs du formulaire en charge utile pour l'API. */
  toPayload?: (values: ModuleRow) => Record<string, unknown>;
  /** Champ interrogé par la recherche serveur. */
  searchable?: boolean;

  initialRows?: ModuleRow[];
  onAction?: (rows: ModuleRow[], columns: ModuleColumn[]) => void;
}

export function ModuleListPage(props: ModuleListPageProps) {
  return props.resource ? <RemoteList {...props} /> : <LocalList {...props} />;
}

// ---------------------------------------------------------------------------
// Version branchée sur l'API
// ---------------------------------------------------------------------------

function RemoteList({
  title,
  description,
  actionLabel,
  columns,
  statusKey,
  fields,
  resource,
  queryKey,
  mapRow,
  toPayload,
  searchable = true,
  onAction,
}: ModuleListPageProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);

  const debouncedSearch = useDebounced(search, 300);
  const key = queryKey ?? [resource!.path];

  const query = useResourceList(key, resource!, {
    page,
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
  });

  const { create, update, remove, isBusy } = useResourceMutations(key, resource!);

  const entities = query.data?.data ?? [];
  const rows = useMemo(
    () => entities.map((entity) => (mapRow ? mapRow(entity) : (entity as ModuleRow))),
    [entities, mapRow],
  );

  function handleSubmit(values: ModuleRow) {
    const body = toPayload ? toPayload(values) : (values as Record<string, unknown>);
    if (editing?.id) update.mutate({ id: String(editing.id), body });
    else create.mutate(body);
  }

  return (
    <div className="space-y-4">
      <Header
        title={title}
        description={description}
        actionLabel={actionLabel}
        canCreate={Boolean(fields)}
        onAction={onAction ? () => onAction(rows, columns) : undefined}
        onCreate={() => {
          setEditing(null);
          setModalOpen(true);
        }}
        total={query.data?.total}
      />

      {searchable && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
          <Input
            placeholder="Filtrer la liste…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      )}

      {query.isLoading ? (
        <TableSkeleton columns={columns.length} />
      ) : query.isError ? (
        <ErrorState error={query.error as ApiError} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={debouncedSearch ? "Aucun résultat" : `Aucun élément dans « ${title} »`}
          detail={
            debouncedSearch
              ? `Rien ne correspond à « ${debouncedSearch} ». Essayez un autre terme.`
              : "Créez le premier élément pour commencer à alimenter ce module."
          }
          action={
            fields && !debouncedSearch ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                {actionLabel ?? "Créer"}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            statusKey={statusKey}
            editable={Boolean(fields)}
            busy={isBusy || query.isFetching}
            onRowClick={(index) => {
              setEditing(entities[index]);
              setModalOpen(true);
            }}
            onDelete={(index) => remove.mutate(String(entities[index].id))}
          />

          <Pagination
            page={query.data?.page ?? page}
            totalPages={query.data?.totalPages ?? 1}
            total={query.data?.total ?? rows.length}
            onChange={setPage}
          />
        </>
      )}

      {fields && (
        <EntityFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? `Modifier — ${title}` : `Nouveau — ${title}`}
          fields={fields}
          initialValues={(editing ?? {}) as ModuleRow}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Version locale (écrans pas encore migrés)
// ---------------------------------------------------------------------------

function LocalList({
  title,
  description,
  actionLabel,
  columns,
  initialRows = [],
  statusKey,
  defaultStatus,
  refPrefix,
  fields,
  onAction,
}: ModuleListPageProps) {
  const [rows, setRows] = useState<ModuleRow[]>(initialRows);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function buildDefaults(): ModuleRow {
    const defaults: ModuleRow = {};
    columns.forEach((col, idx) => {
      if (fields?.some((f) => f.key === col.key)) return;
      if (statusKey === col.key) defaults[col.key] = defaultStatus ?? "Nouveau";
      else if (idx === 0 && refPrefix) defaults[col.key] = generateRef(refPrefix, rows.length + 1);
      else defaults[col.key] = "—";
    });
    return defaults;
  }

  function handleSubmit(values: ModuleRow) {
    setRows((prev) =>
      editingIndex !== null
        ? prev.map((r, i) => (i === editingIndex ? { ...r, ...values } : r))
        : [{ ...buildDefaults(), ...values }, ...prev],
    );
  }

  return (
    <div className="space-y-4">
      <Header
        title={title}
        description={description}
        actionLabel={actionLabel}
        canCreate={Boolean(fields)}
        onAction={onAction ? () => onAction(rows, columns) : undefined}
        onCreate={() => {
          setEditingIndex(null);
          setModalOpen(true);
        }}
        total={rows.length}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Aucune donnée pour le moment"
          detail="Ce module n'est pas encore relié à l'API. Les éléments créés ici ne sont pas enregistrés."
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          statusKey={statusKey}
          editable={Boolean(fields)}
          onRowClick={(index) => {
            setEditingIndex(index);
            setModalOpen(true);
          }}
          onDelete={(index) => setRows((prev) => prev.filter((_, i) => i !== index))}
        />
      )}

      {fields && (
        <EntityFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingIndex !== null ? `Modifier — ${title}` : `Nouveau — ${title}`}
          fields={fields}
          initialValues={editingIndex !== null ? rows[editingIndex] : {}}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pièces partagées
// ---------------------------------------------------------------------------

function Header({
  title,
  description,
  actionLabel,
  canCreate,
  onAction,
  onCreate,
  total,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  canCreate: boolean;
  onAction?: () => void;
  onCreate: () => void;
  total?: number;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
          {total !== undefined && (
            <span className="rounded-md bg-paper px-2 py-0.5 font-mono-tabular text-xs font-medium text-slate">
              {total}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate">{description}</p>
      </div>

      {actionLabel && (canCreate || onAction) && (
        <Button onClick={onAction ?? onCreate}>
          {onAction ? <Download className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function DataTable({
  columns,
  rows,
  statusKey,
  editable,
  busy,
  onRowClick,
  onDelete,
}: {
  columns: ModuleColumn[];
  rows: ModuleRow[];
  statusKey?: string;
  editable: boolean;
  busy?: boolean;
  onRowClick: (index: number) => void;
  onDelete: (index: number) => void;
}) {
  return (
    <div className={cn("transition-opacity", busy && "opacity-60")}>
      <Table>
        <Thead>
          <Tr>
            {columns.map((col) => (
              <Th key={col.key} className={cn(col.align === "right" && "text-right")}>
                {col.label}
              </Th>
            ))}
            {editable && <Th className="w-10" />}
          </Tr>
        </Thead>

        <Tbody>
          {rows.map((row, i) => (
            <motion.tr
              key={String(row.id ?? i)}
              variants={staggerItem}
              initial="initial"
              animate="animate"
              custom={i}
              transition={{ delay: Math.min(i, 12) * 0.02 }}
              className={cn(
                "border-b border-line transition-colors last:border-0 hover:bg-paper/60",
                editable && "cursor-pointer",
              )}
              onClick={editable ? () => onRowClick(i) : undefined}
            >
              {columns.map((col) => {
                const value = row[col.key];
                return (
                  <Td
                    key={col.key}
                    className={cn(
                      col.align === "right" && "text-right",
                      col.mono && "font-mono-tabular",
                      col.key === columns[0].key && "font-medium",
                    )}
                  >
                    {statusKey === col.key ? (
                      <Badge tone={badgeTones[String(value)] ?? "neutral"}>{value}</Badge>
                    ) : (
                      (value ?? "—")
                    )}
                  </Td>
                );
              })}

              {editable && (
                <Td className="text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(i);
                    }}
                    aria-label="Supprimer la ligne"
                    className="rounded-full p-1.5 text-slate transition-colors hover:bg-alert/10 hover:text-alert"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Td>
              )}
            </motion.tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="font-mono-tabular text-xs text-slate">
        Page {page} sur {totalPages} · {total} éléments
      </p>

      <div className="flex gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Précédent
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Suivant
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export { staggerContainer };
