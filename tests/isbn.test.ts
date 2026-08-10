import { describe, it, expect } from "vitest";
import { normalizeIsbn, isValidIsbn } from "@/lib/isbn";

describe("isbn", () => {
  it("chuẩn hóa bỏ dấu gạch và space", () => {
    expect(normalizeIsbn("978-6-04-200001-1")).toBe("9786042000011");
    expect(normalizeIsbn(" 9781539412335 ")).toBe("9781539412335");
  });

  it("chấp nhận ISBN13 hợp lệ prefix 978/979", () => {
    expect(isValidIsbn("9786042000011")).toBe(true);
    expect(isValidIsbn("9791000000000")).toBe(true);
  });

  it("từ chối ISBN không hợp lệ", () => {
    expect(isValidIsbn("1234567890123")).toBe(false);
    expect(isValidIsbn("978604200001")).toBe(false);
    expect(isValidIsbn("abc")).toBe(false);
    expect(isValidIsbn("")).toBe(false);
  });
});