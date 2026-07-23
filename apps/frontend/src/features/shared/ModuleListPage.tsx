import { useState } from "react";
import { Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EntityFormModal, type FieldDef } from "@/components/shared/EntityFormModal";
import type { ModuleColumn, ModuleRow } from "@/types";
import { cn, generateRef } from "@/lib/utils";

const badgeTones: Record<string, "neutral" | "signal" | "amber" | "alert" | "wire"> = {
  "Signé": "signal",
  "Actif": "signal",
  "Payée": "signal",
  "Résolu": "signal",
  "Envoyé": "wire",
  "Nouveau": "wire",
  "En attente": "amber",
  "Ouvert": "amber",
  "En retard": "alert",
};

interface ModuleListPageProps {
  title: string;
  description: string;
  actionLabel?: string;
  columns: ModuleColumn[];
  initialRows: ModuleRow[];
  statusKey?: string;
  defaultStatus?: string;
  refPrefix?: string;
  fields?: FieldDef[];
  /** Si fourni, remplace le formulaire de création par une action directe (ex : export CSV). */
  onAction?: (rows: ModuleRow[], columns: ModuleColumn[]) => void;
}

export function ModuleListPage({
  title,
  description,
  actionLabel,
  columns,
  initialRows,
  statusKey,
  defaultStatus,
  refPrefix,
  fields,
  onAction,
}: ModuleListPageProps) {
  const [rows, setRows] = useState<ModuleRow[]>(initialRows);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function openCreate() {
    setEditingIndex(null);
    setModalOpen(true);
  }

  function openEdit(index: number) {
    setEditingIndex(index);
    setModalOpen(true);
  }

  function buildDefaults(): ModuleRow {
    const defaults: ModuleRow = {};
    columns.forEach((col, idx) => {
      const inFields = fields?.some((f) => f.key === col.key);
      if (inFields) return;
      if (statusKey === col.key) {
        defaults[col.key] = defaultStatus ?? "Nouveau";
      } else if (idx === 0 && refPrefix) {
        defaults[col.key] = generateRef(refPrefix, rows.length + 1);
      } else {
        defaults[col.key] = "—";
      }
    });
    return defaults;
  }

  function handleSubmit(values: ModuleRow) {
    if (editingIndex !== null) {
      setRows((prev) => prev.map((r, i) => (i === editingIndex ? { ...r, ...values } : r)));
    } else {
      setRows((prev) => [{ ...buildDefaults(), ...values }, ...prev]);
    }
  }

  function handleDelete(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleActionClick() {
    if (onAction) onAction(rows, columns);
    else openCreate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-slate">{description}</p>
        </div>
        {actionLabel && (fields || onAction) && (
          <Button onClick={handleActionClick}>
            {onAction && <Download className="h-4 w-4" />}
            {actionLabel}
          </Button>
        )}
      </div>

      <Table>
        <Thead>
          <Tr>
            {columns.map((col) => (
              <Th key={col.key} className={cn(col.align === "right" && "text-right")}>
                {col.label}
              </Th>
            ))}
            {fields && <Th className="w-10" />}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, i) => (
            <Tr
              key={i}
              className={fields ? "cursor-pointer" : undefined}
              onClick={fields ? () => openEdit(i) : undefined}
            >
              {columns.map((col) => {
                const value = row[col.key];
                const isStatus = statusKey === col.key;
                return (
                  <Td
                    key={col.key}
                    className={cn(
                      col.align === "right" && "text-right",
                      col.mono && "font-mono-tabular",
                      col.key === columns[0].key && "font-medium"
                    )}
                  >
                    {isStatus ? <Badge tone={badgeTones[String(value)] ?? "neutral"}>{value}</Badge> : value}
                  </Td>
                );
              })}
              {fields && (
                <Td className="text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(i);
                    }}
                    aria-label="Supprimer la ligne"
                    className="rounded-full p-1.5 text-slate transition-colors hover:bg-alert/10 hover:text-alert"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Td>
              )}
            </Tr>
          ))}
        </Tbody>
      </Table>

      {rows.length === 0 && <p className="py-10 text-center text-sm text-slate">Aucune donnée pour le moment.</p>}

      {fields && (
        <EntityFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          title={editingIndex !== null ? `Modifier — ${title}` : `Nouveau — ${title}`}
          fields={fields}
          initialValues={editingIndex !== null ? rows[editingIndex] : undefined}
        />
      )}
    </div>
  );
}

