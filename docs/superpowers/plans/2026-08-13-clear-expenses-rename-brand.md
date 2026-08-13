# Clear Expenses & Rename Brand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xóa toàn bộ `Expense` records trong database (chạy script một lần) và đổi brand name từ "sách cũ" sang "BookBase" trong metadata.

**Architecture:** Task 1 = file `scripts/clear-expenses.mjs` mới dùng Prisma client, chạy thủ công bằng `node` để deleteMany toàn bộ Expense. Task 2 = sửa 2 dòng metadata trong `app/layout.tsx`.

**Tech Stack:** Node.js (ESM), Prisma 6, Next.js 16.3 metadata API.

## Global Constraints

- File script là `.mjs` (ESM) khớp với `scripts/migrate-from-sheets.mjs` hiện có.
- KHÔNG thêm entry vào `package.json` (per spec — không có npm script).
- KHÔNG có confirm / dry-run trong script (per spec — user explicitly chose no safeguard).
- Sau khi script chạy xong, KHÔNG xóa file (giữ lại trong repo để tham khảo).
- Brand text: `"Sách Cũ"` → `"BookBase"`, `"sách cũ"` (trong description) → `"BookBase"`.
- Verify: `npm test` (4 pre-existing failures OK), `npm run lint` (0 errors), `npm run build` (success).
- Branch: `feat/book-sold-link-to-orders` (PR từ work trước chưa merge). Task mới sẽ thêm commits lên branch này.

---

### Task 1: Tạo clear-expenses script và chạy nó

**Files:**
- Create: `scripts/clear-expenses.mjs`

**Interfaces:**
- Consumes: Prisma `expense.count`, `expense.deleteMany`, `$disconnect`.
- Produces: stdout log với format `Số chi phí hiện tại: N` rồi `Đã xóa: N chi phí`.

- [ ] **Step 1: Tạo file `scripts/clear-expenses.mjs`**

```js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const before = await prisma.expense.count();
console.log(`Số chi phí hiện tại: ${before}`);
const result = await prisma.expense.deleteMany({});
console.log(`Đã xóa: ${result.count} chi phí`);
await prisma.$disconnect();
```

- [ ] **Step 2: Chạy script**

Run: `node scripts/clear-expenses.mjs`

Expected output:
```
Số chi phí hiện tại: <N>
Đã xóa: <N> chi phí
```

Trong đó `<N>` là số rows thực tế trong DB. Cả hai số phải khớp nhau. Nếu DB trống sẵn thì `Số chi phí hiện tại: 0` và `Đã xóa: 0 chi phí` — đó là OK.

Nếu script throw (DB không kết nối / DATABASE_URL sai) → dừng, báo user, KHÔNG commit.

- [ ] **Step 3: Verify DB trống qua API**

Run: `npm run dev` (terminal khác), sau đó:

```bash
curl -s http://localhost:3000/api/expenses
```

Expected: `[]` (empty array). Nếu có rows → dừng, kiểm tra script log.

- [ ] **Step 4: Commit**

```bash
git add scripts/clear-expenses.mjs
git commit -m "chore(scripts): add clear-expenses one-shot script"
```

---

### Task 2: Đổi brand "sách cũ" → "BookBase"

**Files:**
- Modify: `app/layout.tsx:19-20`

**Interfaces:**
- Produces: `metadata.title = "BookBase — Quản lý bán sách"`, `metadata.description = "Quản lý kho, đơn hàng và chi phí cho tiệm BookBase"`.

- [ ] **Step 1: Sửa `app/layout.tsx`**

Mở `app/layout.tsx`, sửa block `metadata` (dòng 18–21) thành:

```ts
export const metadata: Metadata = {
  title: "BookBase — Quản lý bán sách",
  description: "Quản lý kho, đơn hàng và chi phí cho tiệm BookBase",
};
```

- [ ] **Step 2: Verify bằng grep**

Run: `grep -rn 'sách cũ\|Sách Cũ' app/`

Expected: không có match (chỉ có thể có match trong `.next/` nếu đã build, ignore).

Nếu còn match trong `app/` → kiểm tra xem có file nào khác ngoài `layout.tsx` cần sửa không (theo spec thì KHÔNG, nhưng nếu có thì cập nhật spec).

- [ ] **Step 3: Run lint + build**

Run: `npm run lint && npm run build`

Expected: 0 errors, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "chore: rename brand from 'sách cũ' to 'BookBase'"
```

---

### Task 3: Final verification

**Files:** None (read-only).

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: same baseline as before — 21 pass, 4 pre-existing failures (isbn, google-books, db). Không có thay đổi.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: 0 errors. Có thể có 1 warning mới về unused-vars trong script (nếu có) — kiểm tra; nếu có, fix.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: success.

- [ ] **Step 4: Done**

Không commit gì thêm. Plan hoàn tất. Branch `feat/book-sold-link-to-orders` đã có thêm 2 commits mới (clear-expenses + rename brand) + 1 spec commit từ trước.