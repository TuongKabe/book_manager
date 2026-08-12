export function parseDateRange(searchParams: { from?: string | null; to?: string | null }): { from: Date | null; to: Date | null } {
  const from = searchParams.from ? new Date(searchParams.from) : null;
  const to = searchParams.to ? new Date(searchParams.to) : null;
  if (to && !isNaN(to.getTime())) to.setHours(23, 59, 59, 999);
  return {
    from: from && !isNaN(from.getTime()) ? from : null,
    to: to && !isNaN(to.getTime()) ? to : null,
  };
}

export function dateRangeWhere(field: string, from: Date | null, to: Date | null): Record<string, unknown> {
  if (!from || !to) return {};
  return { [field]: { gte: from, lte: to } };
}