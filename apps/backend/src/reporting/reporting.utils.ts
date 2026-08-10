export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ExportColumn {
  key: string;
  label: string;
  width?: number;
}

export interface ExportFile {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

/** Rend une valeur exportable en texte.
 *
 * `String()` appliqué à une valeur de type `unknown` ne suffit pas : un objet
 * qui n'aurait pas son propre `toString` — une relation Prisma incluse par
 * mégarde, par exemple — deviendrait « [object Object] » dans le fichier livré
 * au client, sans que rien ne le signale. Les cas connus sont donc traités
 * explicitement, et le reste part en JSON, lisible et diagnostiquable. */
export function toDisplayString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;

  if (
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  if (value instanceof Date) return value.toLocaleDateString('fr-FR');

  // `Prisma.Decimal` et consorts : un objet qui définit son propre `toString`
  // sait se rendre correctement, on le laisse faire.
  const own: unknown = (value as { toString?: unknown }).toString;
  if (typeof own === 'function' && own !== Object.prototype.toString) {
    return (value as { toString(): string }).toString();
  }

  return JSON.stringify(value) ?? '';
}

/** Sérialise une valeur en champ CSV, en échappant guillemets et
 * séparateurs conformément à la RFC 4180. */
export function toCsvField(value: unknown): string {
  const str = toDisplayString(value);

  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function buildCsv(
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
): Buffer {
  const header = columns.map((c) => toCsvField(c.label)).join(';');

  const lines = rows.map((row) =>
    columns.map((c) => toCsvField(row[c.key])).join(';'),
  );

  // BOM UTF-8 : garantit l'ouverture correcte des accents dans Excel.
  return Buffer.from('\uFEFF' + [header, ...lines].join('\n'), 'utf-8');
}
