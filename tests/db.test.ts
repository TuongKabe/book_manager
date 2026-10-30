import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

// Integration test is intentionally opt-in. CI must never receive a production DB URL.
const databaseTests = process.env.TEST_DATABASE_URL ? describe : describe.skip;
databaseTests("db integration", () => {
  it("reads the Book table in an isolated test database", async () => {
    if (!process.env.TEST_DATABASE_URL) return;
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    try {
      const count = await prisma.book.count();
      expect(typeof count).toBe("number");
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });
});
