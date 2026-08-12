import * as XLSX from "xlsx";

export type ExcelColumn = {
  key: string;
  label: string;
  width?: number;
  format?: (value: unknown) => string | number | null;
};

export type ExcelSheet<T> = {
  name: string;
  rows: T[];
  columns: ExcelColumn[];
};

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

export const dateFormatter = (v: unknown): string => fmtDate(v as string | Date | null | undefined);

export function buildExcel(sheets: Array<{ name: string; rows: unknown[]; columns: ExcelColumn[] }>): { buffer: Buffer; filename: string } {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const data = sheet.rows.map((row) => {
      const result: Record<string, unknown> = {};
      for (const col of sheet.columns) {
        const raw = (row as Record<string, unknown>)[col.key];
        result[col.label] = col.format ? col.format(raw) : raw ?? "";
      }
      return result;
    });

    const ws = XLSX.utils.json_to_sheet(data, { cellDates: false });

    if (sheet.columns.some((c) => c.width)) {
      ws["!cols"] = sheet.columns.map((c) => ({ wch: c.width ?? 12 }));
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  return { buffer: Buffer.concat([bom, buffer]), filename: "export.xlsx" };
}

export function excelResponse(buffer: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function safeFilename(prefix: string, from: Date | null, to: Date | null): string {
  const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  if (from && to) return `${prefix}_${fmt(from)}_${fmt(to)}.xlsx`;
  if (from) return `${prefix}_from_${fmt(from)}.xlsx`;
  if (to) return `${prefix}_to_${fmt(to)}.xlsx`;
  const now = new Date();
  return `${prefix}_${fmt(now)}.xlsx`;
}