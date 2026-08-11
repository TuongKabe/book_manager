# Design: Fix light UI + Edit cho 3 bảng (Orders/Purchases/Expenses)

Date: 2026-08-11
Status: Approved (user OK'd design sections)

## Mục tiêu

Đợt fix light sau khi deploy production, gộp các deferred items:
1. Thêm khả năng **sửa (edit)** cho Orders, Purchases, Expenses (hiện chỉ create/delete).
2. **res.ok + error UI** cho mọi fetch ghi trong toàn app.
3. **Fix timezone date** (date-only parse UTC midnight → lệch 1 ngày).
4. **Empty states** cho các danh sách.
5. **Review UI fix nhẹ** đã thống nhất.

KHÔNG đụng schema/db migration. Chỉ UI + API route client-facing + helper.

## 1. Edit Orders/Purchases/Expenses

### API (3 route mới)

- `app/api/orders/[id]/route.ts`: thêm `PATCH` — validate + update `{date?, channel?, totalVnd?, note?}` (chỉ update field có mặt trong body; `totalVnd` convert Number, falsy→null). Trả về object đã update.
- `app/api/purchases/[id]/route.ts`: thêm `PATCH` — update `{date?, supplier?, totalCost?, note?}`.
- `app/api/expenses/[id]/route.ts`: thêm `PATCH` — update `{date?, category?, amountVnd?, note?}`.

Pattern theo `app/api/books/[id]/route.ts` PATCH hiện có (đọc req.json, dựng `data` object, prisma.update, trả `{ok:true, ...}` hoặc object update).

Date parse dùng helper `parseDateOnly` (mục 3).

### UI

- Tạo `app/components/EditModal.tsx` — modal chung: backdrop `fixed inset-0 z-20 bg-black/40`, container `max-w-md`, props `{ title, onClose, onSave, children, saving? }`. Nút Hủy (`onClose`) + Lưu (`onSave`). Giống khung `BookEditForm`.
- Tạo 3 form edit:
  - `app/orders/OrderEditForm.tsx` — fields: date (date input), channel (text), totalVnd (number), note (text). Prefill từ row.
  - `app/purchases/PurchaseEditForm.tsx` — fields: date, supplier (text), totalCost (number), note.
  - `app/expenses/ExpenseEditForm.tsx` — fields: date, category (select CATEGORIES như ExpenseClient), amountVnd (number), note.
- Mỗi form: `useState` prefill; submit PATCH tới `/api/<entity>/<id>`; check `res.ok`; thành công → cập nhật list cục bộ (thay row cũ bằng response) + đóng modal; lỗi → hiện error banner trong modal, không đóng.
- Thêm state `editing: Row | null` trong 3 client component; nút **Sửa** trên mỗi card/row (kế bên nút Xóa); render modal khi `editing != null`.

## 2. res.ok + error UI

- Mọi thao tác ghi trong app: `create`, `edit` (3 form mới + BookEditForm), `remove` (3 client + BookListClient), `markSold`.
- Pattern chung: sau `fetch`, nếu `!res.ok` → đọc `data.error` (hoặc generic "Có lỗi xảy ra") → set vào `error` state của component → render banner đỏ nhỏ (class `rounded bg-red-100 px-3 py-2 text-red-700 text-sm`) phía trên list/form. Clear error khi thao tác mới bắt đầu.
- Không thêm thư viện.
- `BookEditForm`: thêm field `notes` (text) → gửi `notes` trong PATCH (schema đã có `Book.notes`), bỏ state chết.

## 3. Fix timezone date

- Tạo helper `lib/date.ts`:
  ```ts
  export function parseDateOnly(s: string): Date {
    return new Date(`${s}T12:00:00.000Z`);
  }
  ```
  Noon UTC an toàn cho hiển thị cùng ngày ở mọi timezone UTC-12..+11 (Vercel server UTC; Việt Nam UTC+7).
- Dùng trong mọi route nhận date/soldDate dạng `"YYYY-MM-DD"`:
  - POST/PATCH `/api/orders`, `/api/purchases`, `/api/expenses`
  - POST `/api/books` (soldDate) và PATCH `/api/books/[id]` (soldDate)
  - Giữ nguyên hành vi khi `new Date()` mặc định (không có date gửi lên).
- Hiển thị giữ nguyên `toLocaleDateString("vi-VN")`.
- Test unit cho `parseDateOnly`: noon-UTC không đổi ngày ở các offset điển hình (±7, 0, -8, +12).

## 4. Empty states

- `BookListClient` (Kho sách), `PurchaseListClient`, `OrderClient`, `ExpenseClient`: khi mảng rỗng → hiển thị khối thay thế:
  ```
  <div className="rounded-xl border border-dashed bg-white p-8 text-center text-slate-400">
    Chưa có <danh sách>. <hướng dẫn ngắn>
  </div>
  ```
  - Books: "Chưa có sách — dùng Scan hoặc nhập kho"
  - Orders: "Chưa có đơn hàng — ghi đơn đầu tiên bên trên"
  - Purchases: "Chưa có lô nhập — tạo lô bên trên"
  - Expenses: "Chưa có chi phí — thêm bên trên"

## 5. Review UI fix nhẹ (đã thống nhất)

- BookListClient: bỏ `onBlur={search}` ở select status (search chạy 2 lần khi onBlur + click Tìm).
- BookEditForm: condition select — nếu DB value không nằm trong CONDITIONS, hiển thị giá trị đó (thêm option ẩn) thay vì rỗng.
- Đảm bảo mọi form `flex-wrap` responsive (đã ok ở các client hiện có — verify).
- Không đổi màu sắc/branding.

## Testing

- `npm test` — 18 test cũ + test mới cho `lib/date.ts` (parseDateOnly giữ ngày ở offsets).
- `npm run build` → PASS.
- `npm run lint` → sạch.
- Manual smoke (dev server hoặc production): create→edit→delete cho cả 3 bảng; markSold; verify error banner khi API fail; empty state khi list rỗng.

## Out of scope

- Schema/DB migration (không thêm field, không `details Json?`).
- Migrate lại GSheet, backfill cover, xóa debug branch Apps Script (để follow-up riêng).
- Orders ↔ Books linkage (soldOrderId tự động) — vẫn là follow-up riêng.
- Refactor lớn, đổi pattern hiện có.
