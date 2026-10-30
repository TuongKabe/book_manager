export function normalizeIsbn(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidIsbn(raw: string): boolean {
  const isbn = normalizeIsbn(raw);
  if (/^97[89]\d{10}$/.test(isbn)) {
    const sum = [...isbn].reduce((acc, c, i) => acc + Number(c) * (i % 2 ? 3 : 1), 0);
    return sum % 10 === 0;
  }
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = [...isbn].reduce((acc, c, i) => acc + (c === "X" ? 10 : Number(c)) * (10 - i), 0);
    return sum % 11 === 0;
  }
  return false;
}

export function isbnType(raw: string): "isbn13" | "isbn10" | "ean" | "other" {
  const code = normalizeIsbn(raw);
  if (isValidIsbn(code)) return code.length === 13 ? "isbn13" : "isbn10";
  if (/^\d{13}$/.test(code)) return "ean";
  return "other";
}
