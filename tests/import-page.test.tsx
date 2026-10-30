import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import BookImportPage from "@/app/books/import/page";

describe("Book CSV import page", () => {
  it("renders an accessible CSV file input, a template button, and a link back to inventory", () => {
    const html = renderToStaticMarkup(<BookImportPage />);
    expect(html).toContain("Import sách từ CSV");
    expect(html).toContain("Chọn file CSV");
    expect(html).toContain("Tải file mẫu");
    expect(html).toContain('href="/books"');
    expect(html).toContain("data-testid=\"book-csv-import-page\"");
  });
});
