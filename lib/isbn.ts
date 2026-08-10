export const VALID_ISBN_PREFIXES = ["978", "979"];

export function normalizeIsbn(raw: string): string {
  return raw.replace(/[- ]/g, "").trim();
}

export function isValidIsbn(raw: string): boolean {
  const code = normalizeIsbn(raw);
  return /^\d{13}$/.test(code) &&
    VALID_ISBN_PREFIXES.some((p) => code.startsWith(p));
}