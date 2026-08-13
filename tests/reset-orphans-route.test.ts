import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/books/reset-orphans/route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    book: { updateMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockedUpdateMany = vi.mocked(prisma.book.updateMany);

describe("POST /api/books/reset-orphans", () => {
  beforeEach(() => {
    mockedUpdateMany.mockReset();
  });

  it("calls updateMany with SOLD + soldOrderId null and returns resetCount", async () => {
    mockedUpdateMany.mockResolvedValue({ count: 7 } as never);
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ resetCount: 7 });
    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: { status: "SOLD", soldOrderId: null },
      data: {
        status: "LISTED",
        soldDate: null,
        soldPriceVnd: null,
        soldChannel: null,
        soldOrderId: null,
      },
    });
  });

  it("returns resetCount: 0 when nothing to reset", async () => {
    mockedUpdateMany.mockResolvedValue({ count: 0 } as never);
    const res = await POST();
    expect(await res.json()).toEqual({ resetCount: 0 });
  });
});
