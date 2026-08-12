function escapeCsvField(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export type CsvColumn = {
  key: string;
  label: string;
  format?: (value: unknown) => string | number | null;
};

export function buildCsv<T>(rows: T[], columns: CsvColumn[]): Buffer {
  const lines: string[] = [];
  lines.push(columns.map((c) => escapeCsvField(c.label)).join(","));
  for (const row of rows) {
    const obj = row as Record<string, unknown>;
    lines.push(
      columns
        .map((c) => {
          const raw = obj[c.key];
          const formatted = c.format ? c.format(raw) : raw ?? "";
          return escapeCsvField(formatted);
        })
        .join(","),
    );
  }
  const csv = lines.join("\r\n");
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  return Buffer.concat([bom, Buffer.from(csv, "utf8")]);
}

export function csvResponse(buffer: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

export const dateFormatter = (v: unknown): string => fmtDate(v as string | Date | null | undefined);

export function safeFilename(prefix: string, from: Date | null, to: Date | null): string {
  const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  if (from && to) return `${prefix}_${fmt(from)}_${fmt(to)}.csv`;
  if (from) return `${prefix}_from_${fmt(from)}.csv`;
  if (to) return `${prefix}_to_${fmt(to)}.csv`;
  const now = new Date();
  return `${prefix}_${fmt(now)}.csv`;
}