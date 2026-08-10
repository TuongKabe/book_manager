import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: true },
    { headers: { "Set-Cookie": "bm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" } },
  );
}