import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const DATA_DIR = process.env.MIGRATE_DATA_DIR || "/tmp/opencode/book-migrate/data";

const read = (name) =>
  JSON.parse(readFileSync(path.join(DATA_DIR, `${name}.json`), "utf8"));

function idxOf(header) {
  return Object.fromEntries(header.map((h, i) => [String(h).trim().toLowerCase(), i]));
}

const clean = (v) => (v == null || v === "" || v === "#N/A" ? null : v);

const str = (row, idx, key) => {
  const i = idx[key];
  if (i == null) return null;
  const v = row[i];
  if (v == null || v === "" || v === "#N/A") return null;
  if (typeof v === "object") return null;
  return String(v);
};

const num = (row, idx, key) => {
  const i = idx[key];
  if (i == null) return null;
  const v = row[i];
  if (v == null || v === "" || v === "#N/A") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const date = (row, idx, key) => {
  const s = str(row, idx, key);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

async function importBooks(rows) {
  const header = rows[0];
  const idx = idxOf(header);
  const dataRows = rows.slice(1);
  const titleIdx = idx["title"];
  const withTitle = dataRows.filter((r) => r[titleIdx] != null && String(r[titleIdx]).trim() !== "");
  const skipped = dataRows.length - withTitle.length;

  let imported = 0;
  let fallbackIds = 0;
  for (const [i, r] of withTitle.entries()) {
    const bookId = str(r, idx, "book_id");
    const id = bookId ? "mig-" + bookId : `mig-row-${i + 1}`;
    if (!bookId) fallbackIds++;

    const purchaseId = str(r, idx, "purchase_id");
    const soldOrderId = str(r, idx, "sold_order_id");

    const status = str(r, idx, "status") || "INTAKE";
    const soldDate = date(r, idx, "sold_date");

    await prisma.book.upsert({
      where: { id },
      create: {
        id,
        isbn: str(r, idx, "isbn"),
        barcode: str(r, idx, "barcode"),
        title: String(r[titleIdx]).trim(),
        author: str(r, idx, "author"),
        category: str(r, idx, "category"),
        condition: str(r, idx, "condition"),
        weightGrams: num(r, idx, "weight_grams"),
        coverPhotoUrl: str(r, idx, "cover_photo_url"),
        defectsNote: str(r, idx, "defects_note"),
        purchaseId: purchaseId ? "mig-" + purchaseId : null,
        purchaseCostVnd: num(r, idx, "purchase_cost_vnd"),
        listPriceVnd: num(r, idx, "list_price_vnd"),
        status,
        soldDate,
        soldPriceVnd: soldDate ? num(r, idx, "sold_price_vnd") : null,
        soldChannel: soldDate ? str(r, idx, "sold_channel") : null,
        soldOrderId: soldDate && soldOrderId ? "mig-" + soldOrderId : null,
        notes: str(r, idx, "notes"),
      },
      update: {},
    });
    imported++;
  }
  console.log(`Book: imported ${imported} (source ${dataRows.length}, skipped ${skipped}, fallback ids ${fallbackIds})`);
}

async function importPurchases(rows) {
  const header = rows[0];
  const idx = idxOf(header);
  const dataRows = rows.slice(1);
  let imported = 0;
  for (const r of dataRows) {
    const id = "mig-" + r[idx["purchase_id"]];
    const notes = str(r, idx, "notes");
    await prisma.purchase.upsert({
      where: { id },
      create: {
        id,
        date: date(r, idx, "purchase_date") || new Date(),
        supplier: notes || "",
        totalCost: num(r, idx, "total_cost_vnd") ?? 0,
        note: notes,
      },
      update: {},
    });
    imported++;
  }
  console.log(`Purchase: imported ${imported} (source ${dataRows.length})`);
}

async function importOrders(rows) {
  const header = rows[0];
  const idx = idxOf(header);
  const dataRows = rows.slice(1);
  let imported = 0;
  for (const r of dataRows) {
    const id = "mig-" + r[idx["order_id"]];
    await prisma.order.upsert({
      where: { id },
      create: {
        id,
        date: date(r, idx, "order_date") || new Date(),
        channel: str(r, idx, "channel"),
        totalVnd: num(r, idx, "total_vnd"),
        note: str(r, idx, "notes"),
      },
      update: {},
    });
    imported++;
  }
  console.log(`Order: imported ${imported} (source ${dataRows.length})`);
}

async function importExpenses(rows) {
  const header = rows[0];
  const idx = idxOf(header);
  const dataRows = rows.slice(1);
  let imported = 0;
  for (const r of dataRows) {
    const id = "mig-" + r[idx["expense_id"]];
    await prisma.expense.upsert({
      where: { id },
      create: {
        id,
        date: date(r, idx, "date") || new Date(),
        category: String(str(r, idx, "category") ?? "OTHER"),
        amountVnd: num(r, idx, "amount_vnd") ?? 0,
        note: str(r, idx, "description") || null,
      },
      update: {},
    });
    imported++;
  }
  console.log(`Expense: imported ${imported} (source ${dataRows.length})`);
}

await importPurchases(read("Purchases"));
await importBooks(read("Catalog"));
await importOrders(read("Orders"));
await importExpenses(read("Expenses"));
await prisma.$disconnect();
