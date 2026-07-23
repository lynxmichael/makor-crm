import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ModuleColumn, ModuleRow } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCFA(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
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
