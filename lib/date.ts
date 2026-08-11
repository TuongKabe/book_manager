export function parseDateOnly(s: string): Date {
  return new Date(`${s}T12:00:00.000Z`);
}

export function toDateInputValue(d: Date | string): string {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}