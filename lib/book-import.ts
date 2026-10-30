export const MAX_IMPORT_BOOKS = 500;

export type ImportBook = {
  title: string;
  isbn: string | null;
  barcode: string | null;
  author: string | null;
  category: string | null;
  condition: string | null;
  weightGrams: number | null;
  purchaseCostVnd: number | null;
  listPriceVnd: number | null;
  status: "INTAKE" | "LISTED";
  notes: string | null;
};

const LABELS: Record<string, keyof ImportBook> = {
  "tieu de": "title", "ten sach": "title", title: "title",
  isbn: "isbn", "ma isbn": "isbn",
  barcode: "barcode", "ma vach": "barcode",
  "tac gia": "author", author: "author",
  "phan loai": "category", "the loai": "category", category: "category",
  "tinh trang": "condition", condition: "condition",
  "can nang g": "weightGrams", "khoi luong g": "weightGrams", weightgrams: "weightGrams",
  "gia nhap d": "purchaseCostVnd", "gia nhap": "purchaseCostVnd", purchasecostvnd: "purchaseCostVnd",
  "gia ban d": "listPriceVnd", "gia ban": "listPriceVnd", listpricevnd: "listPriceVnd",
  "trang thai": "status", status: "status",
  "ghi chu": "notes", notes: "notes",
};

function labelKey(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim();
}

function parseTable(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  const head = input.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (head.match(/;/g) ?? []).length > (head.match(/,/g) ?? []).length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted) quoted = false;
      else if (!cell.trim()) quoted = true;
      else throw new Error("Dấu ngoặc kép CSV không đúng định dạng");
    } else if (ch === delimiter && !quoted) {
      row.push(cell.trim()); cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell.trim()); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (quoted) throw new Error("CSV có ô chưa đóng dấu ngoặc kép");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function moneyOrWeight(value: string, label: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw) && !/^\d{1,3}([., ]\d{3})+$/.test(raw)) {
    throw new Error(label + " phải là số nguyên không âm (vd: 120000 hoặc 120.000)");
  }
  const valueNum = Number(raw.replace(/[., ]/g, ""));
  if (!Number.isSafeInteger(valueNum) || valueNum > 2147483647) {
    throw new Error(label + " vượt giới hạn");
  }
  return valueNum;
}

function readStatus(value: string): "INTAKE" | "LISTED" {
  const s = labelKey(value);
  if (!s || s === "intake" || s === "nhap kho") return "INTAKE";
  if (s === "listed" || s === "dang ban") return "LISTED";
  throw new Error("Trạng thái chỉ nhận INTAKE/Nhập kho hoặc LISTED/Đang bán; không import sách đã bán");
}

export function validateImportBook(raw: unknown): ImportBook {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Dòng dữ liệu không hợp lệ");
  }
  const obj = raw as Record<string, unknown>;
  const stringField = (key: keyof ImportBook, max = 500): string | null => {
    const v = obj[key];
    if (v == null || v === "") return null;
    if (typeof v !== "string") throw new Error(String(key) + " phải là chuỗi");
    const s = v.trim();
    if (s.length > max) throw new Error(String(key) + " quá dài");
    return s || null;
  };
  const title = stringField("title", 300);
  if (!title) throw new Error("Thiếu tiêu đề sách");
  const isbn = stringField("isbn", 30);
  if (isbn && !/^[0-9Xx\- ]{10,25}$/.test(isbn)) {
    throw new Error("ISBN phải ở dạng mã số (không dùng định dạng số mũ Excel)");
  }
  const status = readStatus(stringField("status", 30) ?? "");
  const num = (key: "weightGrams" | "purchaseCostVnd" | "listPriceVnd") => {
    const value = obj[key];
    if (value == null || value === "") return null;
    if (typeof value !== "number" && typeof value !== "string") throw new Error(key + " không hợp lệ");
    return moneyOrWeight(String(value), key);
  };
  return {
    title,
    isbn: isbn?.replace(/[\s-]/g, "") ?? null,
    barcode: stringField("barcode", 40),
    author: stringField("author", 300),
    category: stringField("category", 120),
    condition: stringField("condition", 40),
    weightGrams: num("weightGrams"),
    purchaseCostVnd: num("purchaseCostVnd"),
    listPriceVnd: num("listPriceVnd"),
    status,
    notes: stringField("notes", 2000),
  };
}

export function parseBookCsv(text: string): { books: ImportBook[]; errors: string[] } {
  let table: string[][];
  try {
    table = parseTable(text);
  } catch (e) {
    return { books: [], errors: [(e as Error).message] };
  }
  if (!table.length) return { books: [], errors: ["Tệp CSV trống"] };
  const keys = table[0].map((h) => LABELS[labelKey(h)]);
  if (!keys.includes("title")) {
    return { books: [], errors: ["Thiếu cột Tiêu đề (hoặc title / Tên sách)"] };
  }
  if (table.length - 1 > MAX_IMPORT_BOOKS) {
    return { books: [], errors: [`Mỗi lần chỉ nhập tối đa ${MAX_IMPORT_BOOKS} cuốn; hãy chia tệp thành nhiều phần`] };
  }
  const books: ImportBook[] = [];
  const errors: string[] = [];
  for (const [index, cells] of table.slice(1).entries()) {
    if (cells.length > table[0].length) {
      errors.push(`Dòng ${index + 2}: Số cột vượt quá tiêu đề; kiểm tra dấu phẩy và dấu ngoặc kép`);
      continue;
    }
    const obj: Record<string, unknown> = {};
    keys.forEach((key, i) => { if (key) obj[key] = cells[i] ?? ""; });
    try {
      // Use the same validation on the client and the server.
      books.push(validateImportBook(obj));
    } catch (e) {
      errors.push(`Dòng ${index + 2}: ${(e as Error).message}`);
    }
  }
  return { books, errors };
}
