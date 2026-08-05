import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ModuleColumn, ModuleRow } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats français, point de passage unique.
 *
 * `fr-FR` sépare les milliers par une espace insécable étroite et n'emploie
 * jamais le point décimal anglo-saxon : `1 250 000 FCFA`, pas `1,250,000`.
 */
const NUMBER_FR = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function formatCFA(amount: number): string {
  return `${NUMBER_FR.format(amount)} FCFA`;
}

/** Montant abrégé pour les cartes KPI : `42,8 M`, `680,5 k`. */
export function formatCFACompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k`;
  }
  return NUMBER_FR.format(amount);
}

export function formatNumber(value: number): string {
  return NUMBER_FR.format(value);
}

/** Un ratio 0-1 tel que le renvoie l'API devient `31 %`. */
export function formatRate(ratio: number, fractionDigits = 0): string {
  return `${(ratio * 100).toLocaleString("fr-FR", {
    maximumFractionDigits: fractionDigits,
  })} %`;
}

export function formatDays(days: number): string {
  return `${days.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} j.`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function generateRef(prefix: string, count: number): string {
  return `${prefix}-${String(count).padStart(3, "0")}`;
}

export function exportRowsAsCsv(
  filename: string,
  columns: { key: string; label: string }[],
  rows: Record<string, string | number>[]
) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows.map((row) => columns.map((c) => escape(String(row[c.key] ?? ""))).join(",")).join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function csvExportAction(filename: string) {
  return (rows: ModuleRow[], columns: ModuleColumn[]) => exportRowsAsCsv(filename, columns, rows);
}
