import { describe, it, expect } from "vitest";
import { lookupISBN } from "@/lib/google-books";

function stubFetch(body: unknown, ok = true) {
  return async () => ({ ok, json: async () => body }) as Response;
}

describe("lookupISBN", () => {
  it("trả BookInfo khi Google Books có kết quả", async () => {
    const book = await lookupISBN("9781539412335", stubFetch({
      items: [{
        volumeInfo: {
          title: "Published",
          authors: ["Chandler Bolt"],
          categories: ["Computers"],
          description: "mot cuon sach",
          imageLinks: { thumbnail: "http://example.com/c.jpg" },
        },
      }],
    }));
    expect(book).toEqual({
      title: "Published",
      author: "Chandler Bolt",
      category: "Tham khảo",
      thumbnail: "https://example.com/c.jpg",
      description: "mot cuon sach",
    });
  });

  it("trả null khi không có items", async () => {
    const book = await lookupISBN("9786042000011", stubFetch({ items: [] }));
    expect(book).toBeNull();
  });

  it("trả null khi fetch lỗi (403)", async () => {
    const book = await lookupISBN("9781539412335", stubFetch({}, false));
    expect(book).toBeNull();
  });

  it("từ chối ISBN không hợp lệ", async () => {
    await expect(lookupISBN("1234567890123", stubFetch({ items: [] })))
      .rejects.toThrow("INVALID_ISBN");
  });
});