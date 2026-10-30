import { describe, it, expect } from "vitest";
import { parseBookCsv, validateImportBook } from "@/lib/book-import";

describe("CSV book import", () => {
  it("reads Vietnamese headers, BOM, semicolon and quoted fields", () => {
    const csv = '\uFEFFTiêu đề;ISBN;Tác giả;Giá nhập (đ);Trạng thái\r\n"Cuốn A; tập 1";9786041234567;Tác giả;25.000;Đang bán\r\n';
    const result = parseBookCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.books).toHaveLength(1);
    expect(result.books[0]).toMatchObject({ title: "Cuốn A; tập 1", purchaseCostVnd: 25000, status: "LISTED" });
  });
  it("keeps multiple physical books with the same ISBN", () => {
    const result = parseBookCsv("title,isbn\nFirst,9786041234567\nSecond,9786041234567\n");
    expect(result.errors).toEqual([]);
    expect(result.books).toHaveLength(2);
  });
  it("rejects missing titles and invalid prices without importing partial results", () => {
    const result = parseBookCsv("title,listPriceVnd\n,1000\nValid,-100\n");
    expect(result.errors).toHaveLength(2);
  });
  it("rejects sold records without order links", () => {
    expect(() => validateImportBook({ title: "Book", status: "SOLD" })).toThrow();
  });
  it("supports commas inside quoted titles", () => {
    expect(parseBookCsv('title,author\n"One, Two","A ""quoted"" writer"\n').books[0].title).toBe("One, Two");
  });
});
