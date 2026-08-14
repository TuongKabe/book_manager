import { describe, it, expect } from "vitest";
import { WORKFLOWS } from "@/app/help/content";

describe("help content", () => {
  it("có đúng 8 workflow", () => {
    expect(WORKFLOWS).toHaveLength(8);
  });

  it("id là unique và url-friendly", () => {
    const ids = WORKFLOWS.map((w) => w.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("mỗi workflow có đủ field bắt buộc", () => {
    for (const w of WORKFLOWS) {
      expect(w.title).toBeTruthy();
      expect(w.shortTitle).toBeTruthy();
      expect(w.purpose).toBeTruthy();
      expect(w.whenToUse).toBeTruthy();
      expect(w.steps.length).toBeGreaterThan(0);
      expect(w.notes.length).toBeGreaterThan(0);
      expect(w.ctaHref).toMatch(/^\//);
      expect(w.ctaLabel).toBeTruthy();
    }
  });

  it("number từ 1 đến 8 đúng thứ tự", () => {
    WORKFLOWS.forEach((w, i) => {
      expect(w.number).toBe(i + 1);
    });
  });
});