import { describe, it, expect } from "vitest";
import { lookupISBN, searchBooksByName } from "@/lib/google-books";

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
    const book = await lookupISBN("9786042000017", stubFetch({ items: [] }));
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

describe("searchBooksByName", () => {
  it("trả BookInfo[] khi có kết quả", async () => {
    const books = await searchBooksByName("react", stubFetch({
      items: [
        {
          volumeInfo: {
            title: "Learning React",
            authors: ["Alex Banks"],
            categories: ["Computers"],
            description: "book desc",
            imageLinks: { thumbnail: "http://example.com/a.jpg" },
          },
        },
        {
          volumeInfo: {
            title: "React Hooks",
            authors: ["Eve Porcello"],
            categories: ["Computers"],
            description: "hooks desc",
            imageLinks: { thumbnail: "http://example.com/b.jpg" },
          },
        },
      ],
    }));
    expect(books).toHaveLength(2);
    expect(books[0].title).toBe("Learning React");
    expect(books[1].title).toBe("React Hooks");
  });

  it("trả mảng rỗng khi không có items", async () => {
    const books = await searchBooksByName("xyznotfound", stubFetch({ items: [] }));
    expect(books).toEqual([]);
  });

  it("trả mảng rỗng khi fetch lỗi", async () => {
    const books = await searchBooksByName("react", stubFetch({}, false));
    expect(books).toEqual([]);
  });

  it("bỏ qua items không có volumeInfo", async () => {
    const books = await searchBooksByName("react", stubFetch({
      items: [
        { volumeInfo: { title: "Good Book", authors: ["Author"], categories: ["Cat"] } },
        {},
        { volumeInfo: { title: "Also Good", authors: ["B"], categories: ["C"] } },
      ],
    }));
    expect(books).toHaveLength(2);
  });
});