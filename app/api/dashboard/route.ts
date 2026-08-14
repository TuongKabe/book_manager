import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard";

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  const from = parseDate(req.nextUrl.searchParams.get("from"));
  const to = parseDate(req.nextUrl.searchParams.get("to"));
  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to dates" }, { status: 400 });
  }
  to.setHours(23, 59, 59, 999);
  const data = await getDashboardData(from, to);
  return NextResponse.json(data);
}