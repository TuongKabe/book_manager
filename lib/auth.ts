const encoder = new TextEncoder();

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signSession(): Promise<string> {
  const pass = process.env.PASSCODE ?? "";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`book-manager:${pass}`),
  );
  return hex(digest);
}

export async function isSessionValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return token === (await signSession());
}