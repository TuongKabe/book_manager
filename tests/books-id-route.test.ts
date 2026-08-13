import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/books/[id]/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    book: { update: vi.fn(), delete: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockedUpdate = vi.mocked(prisma.book.update);

function req(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/books/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("PATCH /api/books/[id] — SOLD guard", () => {
  beforeEach(() => {
    mockedUpdate.mockReset();
  });

  it("rejects status=SOLD without soldOrderId with 400", async () => {
    const res = await PATCH(req("book1", { status: "SOLD" }), {
      params: Promise.resolve({ id: "book1" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/soldOrderId/);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("accepts status=SOLD with soldOrderId", async () => {
    mockedUpdate.mockResolvedValue({ id: "book1", status: "SOLD" } as never);
    const res = await PATCH(
      req("book1", { status: "SOLD", soldOrderId: "order1" }),
      { params: Promise.resolve({ id: "book1" }) },
    );
    expect(res.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalled();
  });

  it("accepts status=LISTED without soldOrderId", async () => {
    mockedUpdate.mockResolvedValue({ id: "book1", status: "LISTED" } as never);
    const res = await PATCH(req("book1", { status: "LISTED" }), {
      params: Promise.resolve({ id: "book1" }),
    });
    expect(res.status).toBe(200);
  });
});