/**
 * Formatage partagé. Le FCFA n'a pas de décimales et le CDC (§12) en fait
 * la devise de référence : on centralise ici pour ne pas voir passer
 * trois formatages différents dans trois modules.
 */

const fcfa = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const decimal = new Intl.NumberFormat("fr-FR");

export function formatMoney(value: number | string | null | undefined): string {
  const n = toNumber(value);
  return n === null ? "—" : fcfa.format(n);
}

/** Version courte pour les cartes de KPI : « 12,3 M FCFA ». */
export function formatMoneyCompact(value: number | string | null | undefined): string {
  const n = toNumber(value);
  return n === null ? "—" : `${compact.format(n)} FCFA`;
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = toNumber(value);
  return n === null ? "—" : decimal.format(n);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits).replace(".", ",")} %`;
}

export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d
    ? d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";
}

/** « il y a 22 min », « hier »… pour les fils d'activité et notifications. */
export function formatRelative(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";

  const diff = Date.now() - d.getTime();
  const minutes = Math.round(diff / 60_000);

  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  const days = Math.round(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;

  return formatDate(d);
}

export function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : null;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
