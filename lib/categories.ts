const CATEGORY_MAP: Record<string, string> = {
  Fiction: "Tiểu thuyết",
  Literary: "Tiểu thuyết",
  Computers: "Tham khảo",
  Technology: "Tham khảo",
  Medical: "Tham khảo",
  Reference: "Tham khảo",
  Education: "Giáo trình",
  Textbook: "Giáo trình",
  Comics: "Truyện tranh",
  Children: "Thiếu nhi",
  Juvenile: "Thiếu nhi",
  Language: "Ngoại ngữ",
};

export function mapCategory(googleCategory?: string): string {
  if (!googleCategory) return "Khác";
  return CATEGORY_MAP[googleCategory] ?? "Khác";
}