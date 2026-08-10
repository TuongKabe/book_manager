import { beforeEach, describe, it, expect } from "vitest";
import { signSession, isSessionValid } from "@/lib/auth";

describe("auth", () => {
  beforeEach(() => {
    process.env.PASSCODE = "test123";
  });

  it("token ổn định và verify đúng", async () => {
    const token = await signSession();
    expect(await isSessionValid(token)).toBe(true);
  });

  it("token không đúng bị từ chối", async () => {
    expect(await isSessionValid("wrong")).toBe(false);
    expect(await isSessionValid(undefined)).toBe(false);
  });

  it("đổi passcode làm token cũ hết hiệu lực", async () => {
    const old = await signSession();
    process.env.PASSCODE = "new123";
    expect(await isSessionValid(old)).toBe(false);
  });
});