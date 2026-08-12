export function normalizeIsbn(raw: string): string {
  return raw.replace(/[- ]/g, "").trim();
}

export function isValidIsbn(raw: string): boolean {
  const code = normalizeIsbn(raw);
  if (/^\d{13}$/.test(code)) return true;
  if (/^\d{10}$/.test(code)) return true;
  return false;
}

export function isbnType(raw: string): "isbn13" | "isbn10" | "ean" | "other" {
  const code = normalizeIsbn(raw);
  if (/^97[89]\d{10}$/.test(code)) return "isbn13";
  if (/^\d{10}$/.test(code)) return "isbn10";
  if (/^\d{13}$/.test(code)) return "ean";
  return "other";
}
