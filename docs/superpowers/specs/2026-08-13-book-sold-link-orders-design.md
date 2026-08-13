# Sửa logic đánh dấu đã bán trong Kho sách

## Vấn đề

Trang `/books` (Kho sách) hiện có nút "Đã bán" trên mỗi `BookCard` gọi thẳng
`PATCH /api/books/[id]` với `{ status: "SOLD" }`. Hành vi này:

1. Tạo **orphan sold books**: `status = SOLD` nhưng `soldOrderId = null`,
   `soldChannel = null`, `soldPriceVnd = null`. Sách không gắn với đơn nào.
2. Vi phạm invariant ngầm của data model: quan hệ `Book.soldOrderId → Order.id`
   tồn tại nhưng không được enforce.
3. Sai quy trình nghiệp vụ: mọi giao dịch bán phải đi qua `Order` để ghi nhận
   khách hàng, kênh, ngày, phí ship — không có "bán lẻ ngoài luồng".

Ngược lại, `POST /api/orders` và `PATCH /api/orders/[id]` đã làm đúng:
tự động set `Book.status = SOLD`, `soldOrderId = order.id`, `soldDate = now`,
`soldPriceVnd = book.listPriceVnd`, `soldChannel = order.channel` cho từng sách
trong đơn.

## Mục tiêu

- 100% sách `status = SOLD` phải có `soldOrderId` hợp lệ.
- Người dùng chỉ có thể đánh dấu sách đã bán thông qua luồng tạo/sửa đơn hàng.
- Sách SOLD trong trang Kho sách hiển thị link tới đơn tương ứng.
- Dữ liệu legacy (orphan sold books) được reset về `LISTED` một lần.

## Approach đã chốt

| # | Hạng mục | Quyết định |
|---|----------|-----------|
| A | Nút "Đã bán" trong `BookCard` | **Xóa** |
| B | Sách SOLD có `soldOrderId` | **Hiển thị link "Xem đơn #…"** → click mở `OrderModal` edit |
| C | Sách SOLD không `soldOrderId` (legacy, sau cleanup) | Text "Bán ngoài hệ thống" (không click) |
| D | API `PATCH /api/books/[id]` set `status = SOLD` | **Reject 400** nếu thiếu `soldOrderId` |
| E | Data cũ (orphan SOLD) | **Reset về `LISTED`** |

## Thay đổi

### Backend

#### `app/api/books/[id]/route.ts`
- Bỏ auto-set `soldDate = new Date()` khi `body.status === "SOLD"`. Lý do:
  Orders API đã tự set `soldDate` đúng lúc tạo/sửa đơn — không cần PATCH sách
  tự set lại.
- Thêm guard ngay đầu hàm `PATCH`:
  ```ts
  if (body.status === "SOLD" && !body.soldOrderId) {
    return NextResponse.json(
      { error: "Sách đã bán phải gắn với đơn hàng (soldOrderId)" },
      { status: 400 }
    );
  }
  ```
- Các nhánh còn lại (set `soldDate = null` khi đổi sang status ≠ SOLD, cập nhật
  các field khác) giữ nguyên.

#### `app/api/books/reset-orphans/route.ts` (mới)
- `POST`: reset tất cả `Book` có `status = "SOLD"` và `soldOrderId IS NULL` về
  `LISTED` (clear `soldDate`, `soldPriceVnd`, `soldChannel`, `soldOrderId`).
- Trả về `{ resetCount: number }`.
- Dùng `prisma.book.updateMany` trong một transaction.

#### `app/api/orders/[id]/route.ts`
- Không sửa — `GET` đã có sẵn và trả đúng shape cho `OrderModal`.

### Frontend

#### `app/books/BookListClient.tsx`
- Xóa hàm `markSold`.
- Thêm state `viewingOrder: OrderRow | null`.
- Thêm hàm `openOrderForBook(book)`:
  1. Set loading cục bộ.
  2. `fetch('/api/orders/' + book.soldOrderId)`.
  3. Nếu OK → set `viewingOrder = result`.
  4. Nếu lỗi → `setError(...)`.
- Sửa `BookCard`:
  - `book.status === "SOLD"`:
    - `soldOrderId` tồn tại → button `Receipt` icon "Xem đơn #<shortId>",
      onClick gọi `openOrderForBook(book)`. `shortId` lấy 6 ký tự đầu của
      `book.soldOrderId`.
    - `soldOrderId === null` → span text "Bán ngoài hệ thống" (faint).
  - `book.status !== "SOLD"`: chỉ giữ nút Sửa + Xóa (giống flow cũ).
- Render `<OrderModal isOpen={!!viewingOrder} initialOrder={viewingOrder}
  onClose={() => setViewingOrder(null)} />` cuối component.
- Thêm nút "Dọn sách SOLD lỗi" ở `PageHeader.toolbar`:
  - Variant `secondary`, icon `Broom`.
  - onClick → `confirm("Reset tất cả sách SOLD không có đơn về LISTED?")` →
    `POST /api/books/reset-orphans`. Dùng `notice` state riêng (string) cho
    thông báo thành công; render bằng `<Banner tone="success">{notice}</Banner>`
    cạnh banner lỗi hiện có. Sau reset: setNotice(`Đã dọn ${N} sách SOLD lỗi`)
    + `fetchBooks(q, status)`.
- Thêm state `notice: string` để hiển thị thông báo thành công; clear cùng
  `setError('')` khi bắt đầu action mới.

#### `app/books/BookEditForm.tsx`
- Không sửa (đã đúng — chỉ cho sửa thông tin sách, không đụng status/SOLD).

## Data flow

```
Muốn bán sách?
  → /orders → "Tạo đơn" → chọn sách từ kho → Lưu.
  → Server: tạo Order + update Book { status=SOLD, soldOrderId=order.id,
    soldDate=now, soldPriceVnd=book.listPriceVnd, soldChannel=order.channel }.

Sách SOLD trong /books?
  → Card có link "Xem đơn #abc123" → fetch /api/orders/[id] → mở OrderModal.

Cố set SOLD mà không có soldOrderId qua PATCH /api/books/[id]?
  → 400 "Sách đã bán phải gắn với đơn hàng (soldOrderId)".

Chạy nút "Dọn sách SOLD lỗi"?
  → POST /api/books/reset-orphans → reset orphans về LISTED → refresh list.
```

## Error handling

- `PATCH /api/books/[id]` set SOLD không có `soldOrderId` → **400** với message
  rõ ràng (Vietnamese) để UI `Banner` hiển thị.
- `GET /api/orders/[id]` khi mở modal lỗi (404/500) → `setError` → `Banner` ở
  trang `/books`. Modal không tự mở.
- Cleanup endpoint chạy 0 rows → trả `{ resetCount: 0 }`, hiển thị Banner
  "Đã dọn 0 sách SOLD lỗi". Không crash UI.
- Nếu `book.soldOrderId` tồn tại nhưng order đã bị xóa (race condition) →
  `GET /api/orders/[id]` trả 404 → user thấy banner, đóng modal.

## Testing

### Manual UI

1. Vào `/books`. Sách chưa SOLD: không có nút "Đã bán", chỉ Sửa/Xóa.
2. Sách SOLD có `soldOrderId`: hiển thị "Xem đơn #abc123" → click → modal đơn
   mở đúng, có thể sửa.
3. (Trước khi cleanup) Sách SOLD không `soldOrderId`: hiển thị "Bán ngoài hệ
   thống".
4. Bấm "Dọn sách SOLD lỗi" → confirm → list refresh, sách legacy về LISTED.
5. Sau cleanup, refresh: 0 sách hiển thị "Bán ngoài hệ thống".

### API

```bash
# Phải fail
curl -X PATCH http://localhost:3000/api/books/<id> \
  -H 'Content-Type: application/json' \
  -d '{"status":"SOLD"}'
# expect: 400 { error: "Sách đã bán phải gắn với đơn hàng (soldOrderId)" }

# Phải pass (giả sử có đơn abc)
curl -X PATCH http://localhost:3000/api/books/<id> \
  -H 'Content-Type: application/json' \
  -d '{"status":"SOLD","soldOrderId":"abc"}'
# expect: 200

# Reset orphans
curl -X POST http://localhost:3000/api/books/reset-orphans
# expect: 200 { resetCount: N }

# Fetch order
curl http://localhost:3000/api/orders/<id>
# expect: 200 { ... order with books }
```

## Files changed

- `app/api/books/[id]/route.ts` — thêm guard, bỏ auto-soldDate.
- `app/api/books/reset-orphans/route.ts` — endpoint mới.
- `app/books/BookListClient.tsx` — xóa markSold, thêm openOrderForBook, sửa
  BookCard, thêm nút cleanup, render OrderModal.

## Out of scope

- Không sửa `prisma/schema.prisma` (đã có `soldOrderId` FK).
- Không sửa `POST/PATCH /api/orders` (đã đúng).
- Không thêm authentication / authorization cho cleanup endpoint (single-user
  app hiện tại).
- Không đổi logic Orders page — chỉ thêm đường mở modal từ trang `/books`.