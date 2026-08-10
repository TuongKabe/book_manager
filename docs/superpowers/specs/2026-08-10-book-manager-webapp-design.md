# Sách Cũ Management — Webapp Design

**Ngày:** 2026-08-10
**Repo:** `github.com/TuongKabe/book_manager`
**Quyết định gốc:** Từ bỏ AppSheet (gò bó, scan không hiện thông tin trước khi save), chuyển sang webapp responsive trên PC + điện thoại, deploy Vercel.

## 1. Kiến trúc & stack

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS** — một app duy nhất, deploy Vercel.
- **Database:** PostgreSQL trên Neon (free tier), truy cập qua **Prisma ORM**.
- **Tra ISBN:** Google Books API chạy phía server (route handler). API key giấu trong env Vercel, KHÔNG lộ ra trình duyệt. **Bỏ hẳn Google Apps Script** — toàn bộ logic lookup chuyển về Next.js. Giữ lại `country=VN` (tránh lỗi 403 "Cannot determine user location") và map category tiếng Việt.
- **Auth:** passcode đơn giản. Mật khẩu lưu ở env (`PASSCODE`), session cookie httpOnly, middleware chặn toàn app trừ trang login.
- **UI:** Tiếng Việt.

### Bỏ đi
- Google Apps Script (webhook `/exec`), AppSheet, trigger "Added", API key trong code.
- Google Sheets chỉ còn là bản sao lưu dữ liệu gốc (không đồng bộ 2 chiều).

## 2. Database (4 bảng — đúng logic 4 tab GSheet hiện tại)

### Prisma schema gợi ý

```prisma
model Purchase {
  id          String   @id @default(cuid())
  date        DateTime
  supplier    String
  totalCost   Int      // VND
  note        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  books       Book[]
}

model Book {
  id              String   @id @default(cuid())
  isbn            String?
  barcode         String?
  title           String
  author          String?
  category        String?
  condition       String?  // NEW/LIKE_NEW/VG/GOOD/FAIR/POOR
  weightGrams     Int?
  coverPhotoUrl   String?
  defectsNote     String?
  purchaseId      String?
  purchase        Purchase? @relation(fields: [purchaseId], references: [id])
  purchaseCostVnd Int?
  listPriceVnd    Int?
  status          String   @default("INTAKE") // INTAKE/LISTED/SOLD
  soldDate        DateTime?
  soldPriceVnd    Int?
  soldChannel     String?
  soldOrderId     String?
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Order {
  id        String   @id @default(cuid())
  date      DateTime
  channel   String?
  totalVnd  Int?
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Expense {
  id        String   @id @default(cuid())
  date      DateTime
  category  String
  amountVnd Int
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

> Cột cụ thể của Order dựa theo header thực tế của tab Orders trong GSheet (24 cột A–X) — xác nhận chính xác khi viết script migrate.

## 3. Giao diện & flow

### Responsive
- **Desktop:** sidebar trái.
- **Mobile:** menu dưới (bottom nav).

### Trang
1. **Login** — nhập passcode.
2. **Dashboard** — thống kê ngắn: tổng sách còn tồn kho (status ≠ SOLD), số sách đã bán, doanh thu (tổng `soldPriceVnd` của sách SOLD), chi phí (tổng `amountVnd` của Expense + tổng `purchaseCostVnd` của toàn kho), lợi nhuận chưa thu (doanh thu − chi phí).
3. **Kho sách (Catalog)** — danh sách lọc/tìm theo tên/tác giả/ISBN/trạng thái; sửa/xóa; đổi trạng thái LISTED→SOLD.
4. **Nhập nhanh (Scan)** — quét ISBN, form điền sẵn, lưu vào kho.
5. **Nhập hàng (Purchases)** — tạo lô nhập, xem sách thuộc lô.
6. **Bán hàng (Orders)** — tạo đơn, ghi đơn.
7. **Chi phí (Expenses)** — thêm chi phí, danh sách.

### Flow Nhập nhanh (thay thế scan AppSheet — khắc phục điểm ức chế cũ)
1. Mở camera → quét mã vạch ISBN trên bìa sách.
2. **Form hiện TRƯỚC khi lưu:** title, author, category (map tiếng Việt), cover thumbnail, description tự điền từ Google Books.
3. Người dùng sửa giá nhập, giá bán, tình trạng, chọn lô nhập.
4. Bấm **Lưu** → tạo bản ghi Book, về trang Kho sách.
- Fallback: ô nhập ISBN tay + nút "Tra sách"; trường hợp ISBN không thấy trên Google Books → cảnh báo rõ (nhập tay toàn bộ thông tin).

## 4. Scan mã vạch

- Thư viện **html5-qrcode** (dùng camera điện thoại qua `getUserMedia`). HTTPS có sẵn từ Vercel.
- Mỗi lần quét được mã → giải mã → gọi route lookupISBN → đổ vào form.

## 5. Migrate data (1 lần, GSheet → Neon)

1. Thêm hàm `doGet` JSON export vào Apps Script hiện tại (script hiện đã deploy public) — export toàn bộ 4 sheet (header + rows) thành JSON theo từng sheet.
2. Từ local: gọi URL export → viết tập seed data.
3. `prisma db seed` đổ vào Neon, map theo schema.
4. Xác nhận số dòng khớp giữa GSheet và DB; crawl cover nếu cần.

> Apps Script chỉ dùng ĐÚNG MỘT LẦN cho bước export migrate, sau đó bỏ hẳn. Webapp không phụ thuộc nó ở bất kỳ đâu.

## 6. Deploy

- Tạo repo `TuongKabe/book_manager` trên GitHub (đã login qua `gh` CLI), push code.
- Cài vercel CLI, `vercel --prod`.
- Env vars:
  - `DATABASE_URL` (Neon, branch main)
  - `PASSCODE`
  - `GOOGLE_BOOKS_API_KEY`
- Domain: URL `.vercel.app` mặc định (đủ dùng).

## 7. Kiểm thử

- **Lookup ISBN route:** (a) ISBN hợp lệ có trên Google Books → trả title/author/category/cover; (b) ISBN sách VN không có trên Google Books → thông báo rõ; (c) chuỗi không phải ISBN 13 → báo lỗi hợp lệ.
- **Migrate:** số dòng + tổng tiền key tab khớp giữa GSheet và DB.
- **Auth:** không đăng nhập → redirect login; sai passcode → từ chối.
- **Responsive:** kiểm tra layout trên cỡ mobile/tablet/desktop.