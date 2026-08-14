# Hướng dẫn sử dụng BookBase — Trang `/help`

**Ngày:** 2026-08-14
**Repo:** `github.com/TuongKabe/book_manager`
**Phạm vi:** Bổ sung trang hướng dẫn sử dụng workflow nghiệp vụ, giúp nhân viên mới vào website có thể tự học cách dùng app.

## 1. Bối cảnh & vấn đề

- BookBase hiện là webapp quản lý hiệu sách cũ (nhập kho, bán hàng, chi phí, báo cáo lợi nhuận) với 6 module + login.
- Nhân viên mới (không rành công nghệ) khi vào lần đầu không biết bắt đầu từ đâu, workflow nghiệp vụ cụ thể chạy thế nào.
- README chỉ có hướng dẫn dev (chạy dev server, build) — không phục vụ user cuối.
- Cần trang hướng dẫn trong chính app, tiếng Việt, workflow từng bước, có deep-link sang module tương ứng.

## 2. Mục tiêu & tiêu chí thành công

**Mục tiêu:**
- Nhân viên mới đăng nhập lần đầu có thể tự làm được các workflow nghiệp vụ cơ bản mà không cần hỏi ai.
- Người dùng hiện tại có nơi tra cứu nhanh khi quên thao tác.

**Tiêu chí thành công:**
- Trang `/help` truy cập được từ sidebar (desktop) và bottom nav (mobile) của mọi user đã đăng nhập.
- Có 8 workflow nghiệp vụ chính, mỗi workflow có đủ: Mục đích, Khi nào dùng, Các bước (checklist), Lưu ý, Nút mở nhanh sang module.
- Tiếng Việt, không có jargon kỹ thuật.
- Có thể tick từng bước để theo dõi tiến độ, lưu localStorage.

## 3. Kiến trúc

### Trang mới

- `app/help/page.tsx` — server component, render layout 2 cột.
- `app/help/HelpClient.tsx` — client component, xử lý TOC scroll-spy, checkbox state, URL hash.
- `app/help/content.ts` — data 8 workflow, tách riêng để dễ edit nội dung sau này không phải đụng logic.
- `app/help/help.module.css` — style riêng (CSS Module, không đụng `globals.css`).

### Điều hướng

- Thêm 1 mục vào `app/components/Nav.tsx` items array:
  ```ts
  { href: "/help", label: "Hướng dẫn", icon: Question }
  ```
- Đặt cuối menu (sau "Chi phí"), trước nút "Đăng xuất" (đăng xuất là button riêng).
- Auth: tận dụng middleware hiện tại — trang `/help` tự động được bảo vệ, chỉ user đã đăng nhập mới vào được.

### Data model

```ts
// app/help/content.ts
type Workflow = {
  id: string;           // "nhap-nhanh" — dùng cho URL hash & localStorage
  number: number;       // 1..8
  shortTitle: string;   // "Nhập nhanh" — hiện ở TOC
  title: string;        // Tiêu đề đầy đủ
  purpose: string;      // 1-2 câu
  whenToUse: string;    // 1-2 câu
  steps: string[];      // Mảng các bước
  notes: string[];      // Mảng lưu ý
  ctaLabel: string;     // "→ Mở trang Nhập nhanh"
  ctaHref: string;      // "/scan"
  icon: IconName;       // Icon Phosphor hiển thị cạnh tiêu đề
};
```

```ts
// localStorage state (client-side only)
type Progress = {
  [workflowId: string]: {
    [stepIndex: number]: boolean;
  };
};
// Key: "bookbase:help:progress"
```

### State management

- Checkbox state: dùng `useState` + `useEffect` sync với `localStorage`.
- Không cần server state, không cần API mới.
- Reset: xoá key `bookbase:help:progress` khỏi localStorage sau confirm modal.

## 4. UI / Layout

### Desktop (≥ md)

```
┌─────────────┬───────────────────────────────────────────┐
│ Sidebar     │ Header: "Hướng dẫn sử dụng BookBase"      │
│ ─────────── │                          [Reset checklist]│
│ ...items... ├───────────────────────────────────────────┤
│ Hướng dẫn   │ ┌──────────┐ ┌──────────────────────────┐ │
│             │ │ TOC      │ │ Workflow content         │ │
│             │ │ (sticky) │ │ - Mục đích               │ │
│             │ │          │ │ - Khi nào dùng            │ │
│             │ │ 1. ĐN    │ │ - Các bước (checkbox)    │ │
│             │ │ 2. NN    │ │ - Lưu ý                  │ │
│             │ │ ...      │ │ - [CTA mở trang]         │ │
│             │ │          │ │                          │ │
│             │ │          │ │ 3/5 bước                 │ │
│             │ └──────────┘ └──────────────────────────┘ │
└─────────────┴───────────────────────────────────────────┘
```

- Cột trái (TOC): rộng 240px, sticky khi cuộn nội dung. Item active có border-left màu brand + bg nhạt.
- Cột phải: nội dung workflow, max-width 720px để dễ đọc.

### Mobile (< md)

- TOC ẩn mặc định. Có nút "Mục lục" ở header → mở drawer full-width.
- Mỗi workflow render full-width bên dưới header.

### Hành vi tương tác

- **Click TOC item:** scroll mượt tới section, cập nhật URL hash (`/help#nhap-nhanh`).
- **Scroll nội dung:** IntersectionObserver highlight TOC item tương ứng.
- **Tick checkbox:** lưu vào localStorage ngay lập tức. Hiển thị "3/5 bước" ở đầu workflow.
- **Reset:** bấm nút "Reset tất cả checklist" → confirm modal → xoá localStorage → reload state.
- **CTA mở trang:** dùng Next `<Link>` bình thường — không cần mở tab mới (giữ UX liền mạch).

## 5. Nội dung 8 workflow

Danh sách đầy đủ đã được user duyệt nội dung. Tóm tắt:

1. **Đăng nhập lần đầu** (`#dang-nhap`) → `/login`
2. **Nhập nhanh 1 cuốn sách** (`#nhap-nhanh`) → `/scan`
3. **Nhập cả lô hàng từ nhà cung cấp** (`#nhap-hang`) → `/purchases`
4. **Bán sách cho khách** (`#ban-hang`) → `/orders`
5. **Ghi nhận chi phí phát sinh** (`#chi-phi`) → `/expenses`
6. **Xem báo cáo doanh thu / lợi nhuận** (`#bao-cao`) → `/`
7. **Sửa / xoá thông tin sách** (`#sua-sach`) → `/books`
8. **Xử lý khi quét ISBN không ra thông tin** (`#isbn-loi`) → `/scan`

Nội dung chi tiết từng workflow đặt trong `app/help/content.ts` dưới dạng data array — người dev sau có thể edit text mà không đụng logic component.

## 6. Components cần tạo / sửa

| File | Hành động | Mục đích |
|------|-----------|----------|
| `app/help/page.tsx` | Tạo | Server component, layout 2 cột, gọi `HelpClient` |
| `app/help/HelpClient.tsx` | Tạo | Client component, scroll-spy, checkbox, reset |
| `app/help/content.ts` | Tạo | Data 8 workflow |
| `app/help/help.module.css` | Tạo | Style riêng (TOC sticky, checklist, scrollbar) |
| `app/components/Nav.tsx` | Sửa | Thêm item `{ href: "/help", label: "Hướng dẫn", icon: Question }` |

## 7. Testing & verification

- Manual test desktop (Chrome) và mobile (DevTools responsive).
- Test các flow:
  - Vào `/help` → TOC hiển thị 8 mục.
  - Click TOC item → scroll tới đúng section, hash cập nhật.
  - Reload trang với hash → scroll đúng section.
  - Tick 2 bước → reload → vẫn tick.
  - Bấm Reset → confirm → tick hết bị xoá.
  - Click CTA "Mở trang" → điều hướng đúng module.
  - Đăng xuất → vào lại `/help` → middleware chặn về `/login`.
- Lint + typecheck: `npm run lint && npx tsc --noEmit`.

## 8. Out of scope (YAGNI)

- Không search box trong TOC (8 mục là đủ nhỏ).
- Không làm video hướng dẫn.
- Không build tour overlay dạng spotlight cho lần đầu.
- Không làm server-side persistence cho progress — localStorage là đủ.
- Không thêm hệ thống feedback / comment trong trang hướng dẫn.
- Không dịch đa ngôn ngữ — chỉ tiếng Việt.

## 9. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|--------|------------|
| Nội dung workflow lệch thực tế app khi app thay đổi | Tách `content.ts` riêng, dễ update; đặt người chịu trách nhiệm review mỗi khi đổi flow app |
| localStorage bị xoá → mất progress | Chấp nhận — không nghiêm trọng, progress là tiện ích không bắt buộc |
| Trang `/help` dài, mobile cuộn nhiều | TOC drawer + scroll-spy giúp điều hướng nhanh |
| Hash URL conflict với Next.js routing | Dùng pattern `/help#workflow-id`, Next App Router hỗ trợ sẵn |
