import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/books/import/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: { book: { createMany: vi.fn() } } }));
const createMany = vi.mocked(prisma.book.createMany);
const requestId = "a8d23c3f-4076-4d20-993c-76731335e213";
function request(books: unknown, id: unknown = requestId) {
  return new Request("https://example.com/api/books/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ books, requestId: id }),
  });
}

describe("POST /api/books/import", () => {
  beforeEach(() => { createMany.mockReset(); });
  it("rejects invalid rows before touching the database", async () => {
    const res = await POST(request([{ title: "Valid" }, { title: " " }]));
    expect(res.status).toBe(400);
    expect(createMany).not.toHaveBeenCalled();
    expect((await res.json()).errors[0]).toContain("Dòng 3");
  });
  it("rejects missing or invalid request IDs", async () => {
    const res = await POST(request([{ title: "Valid" }], "not-uuid"));
    expect(res.status).toBe(400);
    expect(createMany).not.toHaveBeenCalled();
  });
  it("creates separate stable IDs for matching ISBN copies and enables retry safety", async () => {
    createMany.mockResolvedValue({ count: 2 });
    const books = [{ title: "Copy 1", isbn: "9786041234567" }, { title: "Copy 2", isbn: "9786041234567" }];
    const first = await POST(request(books));
    expect(first.status).toBe(201);
    const options = createMany.mock.calls[0]![0]!;
    expect(options.skipDuplicates).toBe(true);
    expect(options.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: `import-${requestId}-1`, title: "Copy 1" }),
      expect.objectContaining({ id: `import-${requestId}-2`, title: "Copy 2" }),
    ]));
    createMany.mockResolvedValueOnce({ count: 0 });
    const retry = await POST(request(books));
    expect(await retry.json()).toEqual({ imported: 0, previouslyImported: 2 });
    expect(createMany.mock.calls[1]![0]!.data).toEqual(options.data);
  });
});
