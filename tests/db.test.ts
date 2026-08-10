import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

describe("db", () => {
  it("kết nối và đọc bảng Book được", async () => {
    const count = await prisma.book.count();
    expect(typeof count).toBe("number");
  });
});