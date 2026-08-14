# Clear Expenses & Rename Brand to BookBase

## Mục tiêu

Hai task độc lập, thực hiện theo thứ tự:

1. **Task A** — Xóa toàn bộ `Expense` trong database (chạy một lần duy nhất, không safeguard).
2. **Task B** — Đổi brand name từ "sách cũ" sang "BookBase" trong metadata của root layout.

## Approach đã chốt

### Task A — Script xóa chi phí

| # | Hạng mục | Quyết định |
|---|----------|-----------|
| A1 | Phạm vi xóa | Tất cả `Expense` (no filter) |
| A2 | Cơ chế xóa | `prisma.expense.deleteMany({})` |
| A3 | File mới | `scripts/clear-expenses.mjs` |
| A4 | Cách chạy | `node scripts/clear-expenses.mjs` |
| A5 | NPM script | Không thêm |
| A6 | Confirm / dry-run | Không có (per user) |
| A7 | Logging | In `before` count và `result.count` ra stdout |

### Task B — Đổi brand

| # | Hạng mục | Quyết định |
|---|----------|-----------|
| B1 | Files sửa | `app/layout.tsx`, `app/components/LoginForm.tsx`, `app/components/Nav.tsx` |
| B2 | `metadata.title` | `"Sách Cũ — Quản lý bán sách"` → `"BookBase — Quản lý bán sách"` |
| B3 | `metadata.description` | `"Quản lý kho, đơn hàng và chi phí cho tiệm sách cũ"` → `"Quản lý kho, đơn hàng và chi phí cho tiệm BookBase"` |
| B4 | Không đụng | page titles, favicon, internal labels |

## Thay đổi

### Task A — `scripts/clear-expenses.mjs` (mới)

```js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const before = await prisma.expense.count();
console.log(`Số chi phí hiện tại: ${before}`);
const result = await prisma.expense.deleteMany({});
console.log(`Đã xóa: ${result.count} chi phí`);
await prisma.$disconnect();
```

Lưu ý:
- File `.mjs` (ESM) khớp với `scripts/migrate-from-sheets.mjs` hiện có.
- Dùng `PrismaClient` instance riêng (không import `@/lib/prisma` vì alias path chỉ work trong Next runtime).
- Cuối cùng gọi `$disconnect()` để script exit cleanly.

### Task B — `app/layout.tsx`, `app/components/LoginForm.tsx`, `app/components/Nav.tsx`

Sửa 3 file:

1. `app/layout.tsx` — metadata title/description (dòng 19–20):

```ts
export const metadata: Metadata = {
  title: "BookBase — Quản lý bán sách",
  description: "Quản lý kho, đơn hàng và chi phí cho tiệm BookBase",
};
```

2. `app/components/LoginForm.tsx:48` — brand panel heading: `Sách Cũ` → `BookBase`.
3. `app/components/Nav.tsx:58` — header brand link: `Sách Cũ` → `BookBase`.

## Data flow

### Task A
```
$ node scripts/clear-expenses.mjs
  → import PrismaClient
  → count() → log "Số chi phí hiện tại: N"
  → deleteMany({}) → log "Đã xóa: N chi phí"
  → $disconnect()
  → exit 0
```

### Task B
- Sau khi deploy Next.js mới, browser tab title và meta description đổi sang "BookBase".
- Không cần restart DB hay backfill.

## Error handling

### Task A
- DB không kết nối (DATABASE_URL sai / DB down) → `new PrismaClient()` throw → script exit với non-zero code.
- `count()` hoặc `deleteMany()` throw → script exit non-zero, một phần rows có thể đã xóa (không có transaction).
- Không có rollback — đây là lý do script dùng `deleteMany` (một statement) thay vì loop, để tránh partial state phức tạp.

### Task B
- Không có error mode mới. Metadata là static.

## Testing

### Task A
- Manual: chạy script khi DB có ≥1 expense → verify `Số chi phí hiện tại: N` rồi `Đã xóa: N chi phí` (N khớp).
- Sau khi chạy, `GET /api/expenses` trả `[]`.
- KHÔNG viết unit test (one-off destructive script, không tái sử dụng).

### Task B
- Manual: mở `/` trong browser → DevTools → Elements → `<title>` chứa "BookBase".
- `grep -rn 'sách cũ\|Sách Cũ' app/` không còn match (ngoài ignore cho `.next/`).

## Files changed

- `scripts/clear-expenses.mjs` (mới)
- `app/layout.tsx` (sửa 2 dòng metadata)
- `app/components/LoginForm.tsx` (sửa brand panel, dòng 48)
- `app/components/Nav.tsx` (sửa header brand link, dòng 58)

## Out of scope

- Không xóa file `scripts/clear-expenses.mjs` sau khi chạy (giữ lại để tham khảo / tái sử dụng nếu cần).
- Không thêm README / docs về script (per "không thêm npm script" — không có workflow chính thức).
- Không đổi page titles (các `<h1>` trong từng page), favicon, internal labels.
- Không có schema migration.
- Không có rollback plan cho clear-expenses (xóa là xóa).