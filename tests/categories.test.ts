import { describe, it, expect } from "vitest";
import { mapCategory } from "@/lib/categories";

describe("mapCategory", () => {
  it("map nhóm Google sang tiếng Việt", () => {
    expect(mapCategory("Fiction")).toBe("Tiểu thuyết");
    expect(mapCategory("Education")).toBe("Giáo trình");
    expect(mapCategory("Comics")).toBe("Truyện tranh");
  });
  it("giá trị lạ hoặc rỗng về 'Khác'", () => {
    expect(mapCategory("Sports")).toBe("Khác");
    expect(mapCategory(undefined)).toBe("Khác");
    expect(mapCategory("")).toBe("Khác");
  });
});