import { NextRequest, NextResponse } from "next/server";
import { isSessionValid } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("bm_session")?.value;
  if (await isSessionValid(token)) return NextResponse.next();
  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};