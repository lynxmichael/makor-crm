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

/** Sérialise une valeur en champ CSV, en échappant guillemets et
 * séparateurs conformément à la RFC 4180. */
export function toCsvField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);

  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function buildCsv(columns: ExportColumn[], rows: Record<string, unknown>[]): Buffer {
  const header = columns.map((c) => toCsvField(c.label)).join(';');

  const lines = rows.map((row) =>
    columns.map((c) => toCsvField(row[c.key])).join(';'),
  );

  // BOM UTF-8 : garantit l'ouverture correcte des accents dans Excel.
  return Buffer.from('\uFEFF' + [header, ...lines].join('\n'), 'utf-8');
}
