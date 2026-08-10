import { NextResponse } from "next/server";
import { signSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { passcode } = await req.json();
  if (passcode !== (process.env.PASSCODE ?? "")) {
    return NextResponse.json({ ok: false, error: "WRONG_PASS" }, { status: 401 });
  }
  const token = await signSession();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie":
          `bm_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`,
      },
    },
  );
}