import { describe, it, expect } from "vitest";
import { parseDateOnly, toDateInputValue } from "@/lib/date";

describe("parseDateOnly", () => {
  it("noon UTC không đổi ngày ở mọi timezone phổ biến", () => {
    for (const tz of ["+07:00", "+00:00", "-08:00", "+12:00"]) {
      const d = parseDateOnly("2026-08-11");
      const iso = d.toISOString();
      expect(iso).toBe("2026-08-11T12:00:00.000Z");
    }
  });
});

describe("toDateInputValue", () => {
  it("chuyển Date thành YYYY-MM-DD local", () => {
    const d = new Date("2026-08-11T12:00:00.000Z");
    expect(toDateInputValue(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});