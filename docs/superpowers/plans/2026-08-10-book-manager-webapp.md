# Book Manager Webapp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay AppSheet bằng webapp Sách Cũ Management (Next.js + Neon Postgres) responsive PC/mobile, deploy Vercel, migrate dữ liệu GSheet 1 lần.

**Architecture:** Next.js 15 App Router + TypeScript + Tailwind; Prisma ORM nối Postgres (Neon); auth passcode bằng cookie httpOnly gắn middleware; tra ISBN Google Books chạy server-side (API key giữ trong env); scan mã vạch bằng html5-qrcode ở client.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, Prisma, Neon Postgres, html5-qrcode, Vitest.

## Global Constraints

- Repo: `github.com/TuongKabe/book_manager`; working dir `/home/kabe/book_manager`.
- Node >= 20 (môi trường hiện tại node v22).
- API key Google Books: `AIzaSyAkrk2zgKMU5KHl-Zl9mD1Hg-nNoMG_boE` — nằm trong `GOOGLE_BOOKS_API_KEY` env, KHÔNG viết cứng trong code client.
- Link lookup Google Books LUÔN kèm `&country=VN` (tránh 403 "Cannot determine user location").
- Category trả về bằng tiếng Việt thông qua `mapCategory` (map giữ nguyên như Apps Script cũ).
- ISBN hợp lệ: chuẩn hóa bỏ `-`/` `, đúng 13 chữ số, prefix `978` hoặc `979`.
- UI tiếng Việt. Mọi bảng số liệu giá tính bằng VND (số nguyên).
- Enum status Book: `INTAKE`, `LISTED`, `SOLD` (mặc định `INTAKE`). Condition: `NEW`, `LIKE_NEW`, `VG`, `GOOD`, `FAIR`, `POOR`.
- Bỏ hoàn toàn Google Apps Script khỏi webapp; Apps Script chỉ còn giữ 1 hàm export JSON phục vụ migrate 1 lần.

---

### Task 1: Scaffold Next.js + Tailwind + Vitest

**Files:**
- Create: `vitest.config.ts` (create-next-app tạo phần còn lại)
- Modify: `package.json`

**Interfaces:**
- Consumes: git repo `book_manager` đã init, branch `main`.
- Produces: project chạy được `npm run dev`; `npm test` chạy Vitest.

- [ ] **Step 1: Scaffold Next.js project**

Chạy từ `/home/kabe/book_manager` (create-next-app chấp nhận thư mục có `.git` + `docs/`):

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
```

Kỳ vọng: tạo `app/`, `public/`, `next.config.ts`, `package.json` với scripts `dev/build/start/lint`.

- [ ] **Step 2: Thêm Vitest**

```bash
npm i -D vitest
npm pkg set scripts.test="vitest run"
```

Tạo `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 3: Smoke test + commit**

Tạo `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("vitest chạy được", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Chạy: `npm test` → PASS. Chạy: `npm run build` → BUILD PASS.

```bash
git add -A
git commit -m "chore: scaffold nextjs + tailwind + vitest"
```

---

### Task 2: Prisma schema + client + Neon connect

**Files:**
- Create: `prisma/schema.prisma`, `lib/prisma.ts`, `.env`, `.env.example`
- Test: `tests/db.test.ts`

**Interfaces:**
- Consumes: scaffold từ Task 1.
- Produces: client `prisma` (từ `@/lib/prisma`) — dùng bởi mọi route/task CRUD sau. Schema 4 model: `Purchase`, `Book`, `Order`, `Expense`.

- [ ] **Step 1: Cài Prisma**

```bash
npm i @prisma/client prisma
```

- [ ] **Step 2: Viết schema**

Ghi đè `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Purchase {
  id        String   @id @default(cuid())
  date      DateTime
  supplier  String
  totalCost Int
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  books     Book[]
}

model Book {
  id              String    @id @default(cuid())
  isbn            String?
  barcode         String?
  title           String
  author          String?
  category        String?
  condition       String?
  weightGrams     Int?
  coverPhotoUrl   String?
  defectsNote     String?
  purchaseId      String?
  purchase        Purchase? @relation(fields: [purchaseId], references: [id])
  purchaseCostVnd Int?
  listPriceVnd    Int?
  status          String    @default("INTAKE")
  soldDate        DateTime?
  soldPriceVnd    Int?
  soldChannel     String?
  soldOrderId     String?
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
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

- [ ] **Step 3: Tạo .env / .env.example**

`.env.example`:

```
DATABASE_URL="postgresql://..."
PASSCODE="..."
GOOGLE_BOOKS_API_KEY="AIzaSyAkrk2zgKMU5KHl-Zl9mD1Hg-nNoMG_boE"
```

`.env` là bản sao của `.env.example`. `PASSCODE` do user tự đặt; `DATABASE_URL` do user tạo ở Neon rồi dán vào. Đảm bảo `.gitignore` chứa `.env` (create-next-app đã thêm mặc định).

- [ ] **Step 4: Prisma client singleton**

Tạo `lib/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Chạy: `npx prisma generate`.

- [ ] **Step 5: Neon setup (cần user) + push schema + test DB**

User tạo project Postgres miễn phí tại Neon (đăng ký email) → copy **connection string** (bỏ `?sslmode=require` nếu có) → dán vào `DATABASE_URL` trong `.env`.

Chạy: `npx prisma db push`. Kỳ vọng: schema sync thành công.

Viết `tests/db.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";

describe("db", () => {
  it("kết nối và đọc bảng Book được", async () => {
    const count = await prisma.book.count();
    expect(typeof count).toBe("number");
  });
});
```

Chạy: `npm test` → PASS (khác test db cần DATABASE_URL đã được load từ `.env` bởi Prisma).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: prisma schema + neon connect"
```

---

### Task 3: lib/isbn + lib/categories (unit tested)

**Files:**
- Create: `lib/isbn.ts`, `lib/categories.ts`
- Test: `tests/isbn.test.ts`, `tests/categories.test.ts`

**Interfaces:**
- Consumes: — (thuần, không phụ thuộc task khác).
- Produces:
  - `normalizeIsbn(raw: string): string`
  - `isValidIsbn(raw: string): boolean`
  - `VALID_ISBN_PREFIXES: string[]`
  - `mapCategory(googleCategory?: string): string`

- [ ] **Step 1: Viết test thất bại — `tests/isbn.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { normalizeIsbn, isValidIsbn } from "@/lib/isbn";

describe("isbn", () => {
  it("chuẩn hóa bỏ dấu gạch và space", () => {
    expect(normalizeIsbn("978-6-04-200001-1")).toBe("9786042000011");
    expect(normalizeIsbn(" 9781539412335 ")).toBe("9781539412335");
  });

  it("chấp nhận ISBN13 hợp lệ prefix 978/979", () => {
    expect(isValidIsbn("9786042000011")).toBe(true);
    expect(isValidIsbn("9791000000000")).toBe(true);
  });

  it("từ chối ISBN không hợp lệ", () => {
    expect(isValidIsbn("1234567890123")).toBe(false);
    expect(isValidIsbn("978604200001")).toBe(false);
    expect(isValidIsbn("abc")).toBe(false);
    expect(isValidIsbn("")).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy → kỳ vọng FAIL**

Chạy: `npm test` → FAIL — "Cannot find module '@/lib/isbn'".

- [ ] **Step 3: Viết test thất bại — `tests/categories.test.ts`**

```ts
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
```

- [ ] **Step 4: Viết implementation**

`lib/isbn.ts`:

```ts
export const VALID_ISBN_PREFIXES = ["978", "979"];

export function normalizeIsbn(raw: string): string {
  return raw.replace(/[- ]/g, "").trim();
}

export function isValidIsbn(raw: string): boolean {
  const code = normalizeIsbn(raw);
  return /^\d{13}$/.test(code) &&
    VALID_ISBN_PREFIXES.some((p) => code.startsWith(p));
}
```

`lib/categories.ts`:

```ts
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
```

- [ ] **Step 5: Chạy test → PASS**

Chạy: `npm test` → cả 2 file PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/isbn.ts lib/categories.ts tests/isbn.test.ts tests/categories.test.ts
git commit -m "feat: isbn validation + category mapping"
```

---

### Task 4: lib/google-books lookup (unit tested)

**Files:**
- Create: `lib/google-books.ts`
- Test: `tests/google-books.test.ts`

**Interfaces:**
- Consumes: `normalizeIsbn`, `isValidIsbn`, `mapCategory` (Task 3).
- Produces: `type BookInfo = { title, author, category, thumbnail, description }` (all string); `lookupISBN(raw: string, fetcher?: typeof fetch): Promise<BookInfo | null>` — `fetcher` mặc định là `fetch` toàn cục, cho phép test stub không gọi mạng. Ném `Error("INVALID_ISBN")` nếu ISBN không hợp lệ.

- [ ] **Step 1: Viết test thất bại — `tests/google-books.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { lookupISBN } from "@/lib/google-books";

function stubFetch(body: unknown, ok = true) {
  return async () => ({ ok, json: async () => body }) as Response;
}

describe("lookupISBN", () => {
  it("trả BookInfo khi Google Books có kết quả", async () => {
    const book = await lookupISBN("9781539412335", stubFetch({
      items: [{
        volumeInfo: {
          title: "Published",
          authors: ["Chandler Bolt"],
          categories: ["Computer science"],
          description: "mot cuon sach",
          imageLinks: { thumbnail: "http://example.com/c.jpg" },
        },
      }],
    }));
    expect(book).toEqual({
      title: "Published",
      author: "Chandler Bolt",
      category: "Tham khảo",
      thumbnail: "https://example.com/c.jpg",
      description: "mot cuon sach",
    });
  });

  it("trả null khi không có items", async () => {
    const book = await lookupISBN("9786042000011", stubFetch({ items: [] }));
    expect(book).toBeNull();
  });

  it("trả null khi fetch lỗi (403)", async () => {
    const book = await lookupISBN("9781539412335", stubFetch({}, false));
    expect(book).toBeNull();
  });

  it("từ chối ISBN không hợp lệ", async () => {
    await expect(lookupISBN("1234567890123", stubFetch({ items: [] })))
      .rejects.toThrow("INVALID_ISBN");
  });
});
```

- [ ] **Step 2: Chạy → kỳ vọng FAIL**

Chạy: `npm test` → FAIL (module chưa tồn tại).

- [ ] **Step 3: Viết implementation — `lib/google-books.ts`**

```ts
import { normalizeIsbn, isValidIsbn } from "@/lib/isbn";
import { mapCategory } from "@/lib/categories";

export type BookInfo = {
  title: string;
  author: string;
  category: string;
  thumbnail: string;
  description: string;
};

export async function lookupISBN(
  raw: string,
  fetcher: typeof fetch = fetch,
): Promise<BookInfo | null> {
  const isbn = normalizeIsbn(raw);
  if (!isValidIsbn(raw)) throw new Error("INVALID_ISBN");
  const url =
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}` +
    `&key=${process.env.GOOGLE_BOOKS_API_KEY}&country=VN`;
  const res = await fetcher(url);
  if (!res.ok) return null;
  const data = await res.json();
  const info = data?.items?.[0]?.volumeInfo;
  if (!info) return null;
  return {
    title: info.title ?? "",
    author: info.authors?.join(", ") ?? "",
    category: mapCategory(info.categories?.[0]),
    thumbnail: info.imageLinks?.thumbnail
      ? info.imageLinks.thumbnail.replace(/^http:\/\//, "https://")
      : "",
    description: info.description ?? "",
  };
}
```

- [ ] **Step 4: Chạy test → PASS**

Chạy: `npm test` → 4 test lookupISBN PASS (test dùng stub, không cần env key).

- [ ] **Step 5: Commit**

```bash
git add lib/google-books.ts tests/google-books.test.ts
git commit -m "feat: google books isbn lookup"
```

### Task 5: Auth passcode + middleware + login/logout

**Files:**
- Create: `lib/auth.ts`, `middleware.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/login/page.tsx`, `app/components/LoginForm.tsx`
- Test: `tests/auth.test.ts`

**Interfaces:**
- Consumes: — (Web Crypto global, không node-specific).
- Produces:
  - `signSession(): Promise<string>` — SHA-256 hex của `book-manager:<PASSCODE>`.
  - `isSessionValid(token: string | undefined): Promise<boolean>`
  - Cookie name: `bm_session`.
  - Route `POST /api/auth/login` (`{passcode}`) → 200 + Set-Cookie / 401.
  - Route `POST /api/auth/logout` → 200 + xóa cookie.

- [ ] **Step 1: Viết test thất bại — `tests/auth.test.ts`**

```ts
import { beforeEach, describe, it, expect } from "vitest";
import { signSession, isSessionValid } from "@/lib/auth";

describe("auth", () => {
  beforeEach(() => {
    process.env.PASSCODE = "test123";
  });

  it("token ổn định và verify đúng", async () => {
    const token = await signSession();
    expect(await isSessionValid(token)).toBe(true);
  });

  it("token không đúng bị từ chối", async () => {
    expect(await isSessionValid("wrong")).toBe(false);
    expect(await isSessionValid(undefined)).toBe(false);
  });

  it("đổi passcode làm token cũ hết hiệu lực", async () => {
    const old = await signSession();
    process.env.PASSCODE = "new123";
    expect(await isSessionValid(old)).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy → FAIL**

Chạy: `npm test` → FAIL (module chưa tồn tại).

- [ ] **Step 3: Viết `lib/auth.ts`** (Web Crypto — chạy cả middleware edge lẫn node)

```ts
const encoder = new TextEncoder();

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signSession(): Promise<string> {
  const pass = process.env.PASSCODE ?? "";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`book-manager:${pass}`),
  );
  return hex(digest);
}

export async function isSessionValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return token === (await signSession());
}
```

- [ ] **Step 4: Chạy test → PASS**

Chạy: `npm test` → PASS.

- [ ] **Step 5: Viết `middleware.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { isSessionValid } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("bm_session")?.value;
  if (await isSessionValid(token)) return NextResponse.next();
  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 6: Viết login/logout routes**

`app/api/auth/login/route.ts`:

```ts
import { NextResponse } from "next/server";
import { signSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { passcode } = await req.json();
  if (passcode !== (process.env.PASSCODE ?? "")) {
    return NextResponse.json({ ok: false, error: "WRONG_PASS" }, { status: 401 });
  }
  const token = await signSession();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie":
          `bm_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`,
      },
    },
  );
}
```

`app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: true },
    { headers: { "Set-Cookie": "bm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" } },
  );
}
```

- [ ] **Step 7: Viết trang login**

`app/login/page.tsx` (server component):

```tsx
import LoginForm from "@/app/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <LoginForm />
    </main>
  );
}
```

`app/components/LoginForm.tsx` (client):

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Sai mã truy cập");
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3 rounded-xl bg-white p-6 shadow">
      <h1 className="text-xl font-bold">Quản lý sách cũ</h1>
      <input
        type="password"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        placeholder="Mã truy cập"
        className="w-full rounded border border-slate-300 px-3 py-2"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700">
        Đăng nhập
      </button>
    </form>
  );
}
```

- [ ] **Step 8: Setup env PASSCODE**

User đặt `PASSCODE` trong `.env` (vd `PASSCODE="matkhau123"`) — đồng bộ vào Vercel ở Task 16.

- [ ] **Step 9: Kiểm thử thủ công + commit**

Chạy `npm run dev`: mở `/` → bị redirect về `/login`. Vào `/login` nhập PASSCODE sai → 401; đúng → vào `/`, cookie `bm_session` tồn tại.

```bash
git add lib/auth.ts middleware.ts app/api/auth app/login app/components/LoginForm.tsx tests/auth.test.ts
git commit -m "feat: passcode auth + middleware"
```

### Task 6: Layout + nav responsive (sidebar/bottom nav)

**Files:**
- Create: `app/components/Nav.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: logout route (Task 5).
- Produces: client component `Nav` với `items` fixed: `/`, `/books`, `/scan`, `/purchases`, `/orders`, `/expenses`.

- [ ] **Step 1: Viết `app/components/Nav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const items = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/books", label: "Kho sách", icon: "📚" },
  { href: "/scan", label: "Nhập nhanh", icon: "📷" },
  { href: "/purchases", label: "Nhập hàng", icon: "📥" },
  { href: "/orders", label: "Bán hàng", icon: "💰" },
  { href: "/expenses", label: "Chi phí", icon: "🧾" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-52 flex-col border-r bg-white p-4 md:flex">
        <h1 className="mb-6 text-lg font-bold">Sách Cũ</h1>
        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded px-3 py-2 hover:bg-slate-100 ${
                pathname === item.href ? "bg-blue-50 font-semibold" : ""
              }`}
            >
              <span className="mr-2">{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="mt-auto text-left text-sm text-red-600 hover:underline">
          Đăng xuất
        </button>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t bg-white py-2 md:hidden">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center text-xs ${
              pathname === item.href ? "font-bold text-blue-600" : "text-slate-500"
            }`}
          >
            <span className="text-lg">{item.icon}</span>{item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Sửa `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/app/components/Nav";

export const metadata: Metadata = { title: "Sách Cũ Management" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="bg-slate-50">
        <Nav />
        <div className="md:pl-52">
          <main className="mx-auto max-w-5xl p-4 pb-20 md:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Kiểm thử thủ công + commit**

Chạy `npm run dev` sau khi login → thấy sidebar desktop khi rộng, bottom nav khi hẹp.

```bash
git add app/components/Nav.tsx app/layout.tsx
git commit -m "feat: responsive nav layout"
```

---

### Task 7: Route lookup ISBN (`/api/lookup`)

**Files:**
- Create: `app/api/lookup/route.ts`
- Test: `tests/lookup-route.test.ts`

**Interfaces:**
- Consumes: `lookupISBN` (Task 4).
- Produces: `GET /api/lookup?isbn=<code>` →
  - `400 {ok:false,error:"INVALID_ISBN"}` khi ISBN không hợp lệ
  - `200 {ok:false,error:"NO_ISBN_MATCH"}` khi không tìm thấy
  - `200 {ok:true, book: BookInfo}` khi tìm thấy

- [ ] **Step 1: Viết test thất bại — `tests/lookup-route.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/lookup/route";

function req(isbn: string): Request {
  return new Request(`http://localhost/api/lookup?isbn=${encodeURIComponent(isbn)}`);
}

describe("GET /api/lookup", () => {
  it("trả 400 khi ISBN không hợp lệ", async () => {
    const res = await GET(req("abc"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "INVALID_ISBN" });
  });

  it("trả ok:false khi không match", async () => {
    const res = await GET(req("9786042000011"));
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("NO_ISBN_MATCH");
  });
});
```

Lưu ý: 2 test trên không gọi mạng (`INVALID_ISBN` và một ISBN giả định trả về NO_ISBN_MATCH có thể cần stub — nếu API key thiếu, thay test thứ 2 bằng stub `lookupISBN` qua vitest mock).

- [ ] **Step 2: Chạy → FAIL**

Chạy: `npm test` → FAIL (module route chưa tồn tại).

- [ ] **Step 3: Viết implementation — `app/api/lookup/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { normalizeIsbn, isValidIsbn } from "@/lib/isbn";
import { lookupISBN } from "@/lib/google-books";

export async function GET(req: NextRequest) {
  const isbn = normalizeIsbn(req.nextUrl.searchParams.get("isbn") ?? "");
  if (!isValidIsbn(isbn)) {
    return NextResponse.json({ ok: false, error: "INVALID_ISBN" }, { status: 400 });
  }
  const book = await lookupISBN(isbn);
  if (!book) {
    return NextResponse.json({ ok: false, error: "NO_ISBN_MATCH" });
  }
  return NextResponse.json({ ok: true, book });
}
```

- [ ] **Step 4: Chạy test → PASS**

Chạy: `npm test` → PASS.

- [ ] **Step 5: Kiểm thử thủ công (network)**

Chạy `npm run dev` → mở `http://localhost:3000/api/lookup?isbn=9781539412335` → kỳ vọng `{ok:true, book:{title:"Published"...}}`. (Cần `GOOGLE_BOOKS_API_KEY` trong `.env`.)

- [ ] **Step 6: Commit**

```bash
git add app/api/lookup/route.ts tests/lookup-route.test.ts
git commit -m "feat: isbn lookup api route"
```

### Task 8: API books CRUD + lib/stats (unit tested)

**Files:**
- Create: `lib/stats.ts`, `app/api/books/route.ts`, `app/api/books/[id]/route.ts`, `app/api/stats/route.ts`
- Test: `tests/stats.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2).
- Produces:
  - `computeStats(books, expenses): Stats` — `{inStock, sold, revenue, cost, profit}`.
  - `GET /api/books?q=&status=` → `Book[]` (kèm `purchase`)
  - `POST /api/books` body `{title, isbn?, author?, category?, condition?, weightGrams?, coverPhotoUrl?, defectsNote?, purchaseId?, purchaseCostVnd?, listPriceVnd?, status?, notes?}` → `201 Book`
  - `PATCH /api/books/[id]` body: subset của Book data (gồm `status`, `soldDate`, `soldPriceVnd`, `soldChannel`, `soldOrderId`) → `200 Book`
  - `DELETE /api/books/[id]` → `200 {ok:true}`
  - `GET /api/stats` → `{ status: "ok", data: Stats }`

- [ ] **Step 1: Viết test thất bại — `tests/stats.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { computeStats } from "@/lib/stats";

const books = [
  { status: "SOLD", soldPriceVnd: 50000, purchaseCostVnd: 20000 },
  { status: "SOLD", soldPriceVnd: 0, purchaseCostVnd: 10000 },
  { status: "LISTED", soldPriceVnd: null, purchaseCostVnd: 15000 },
];
const expenses = [{ amountVnd: 5000 }, { amountVnd: 3000 }];

describe("computeStats", () => {
  it("tính đúng các chỉ số", () => {
    expect(computeStats(books, expenses)).toEqual({
      inStock: 1,
      sold: 2,
      revenue: 50000,
      cost: 20000 + 10000 + 15000 + 5000 + 3000,
      profit: 50000 - (20000 + 10000 + 15000 + 5000 + 3000),
    });
  });
});
```

- [ ] **Step 2: Chạy → FAIL**

Chạy: `npm test` → FAIL (module chưa tồn tại).

- [ ] **Step 3: Viết `lib/stats.ts`**

```ts
type BookRow = { status: string; soldPriceVnd: number | null; purchaseCostVnd: number | null };
type ExpenseRow = { amountVnd: number };

export type Stats = {
  inStock: number;
  sold: number;
  revenue: number;
  cost: number;
  profit: number;
};

export function computeStats(books: BookRow[], expenses: ExpenseRow[]): Stats {
  const inStock = books.filter((b) => b.status !== "SOLD").length;
  const sold = books.filter((b) => b.status === "SOLD").length;
  const revenue = books
    .filter((b) => b.status === "SOLD")
    .reduce((t, b) => t + (b.soldPriceVnd ?? 0), 0);
  const stockCost = books.reduce((t, b) => t + (b.purchaseCostVnd ?? 0), 0);
  const expenseTotal = expenses.reduce((t, e) => t + e.amountVnd, 0);
  const cost = stockCost + expenseTotal;
  return { inStock, sold, revenue, cost, profit: revenue - cost };
}
```

- [ ] **Step 4: Chạy test → PASS**

Chạy: `npm test` → PASS.

- [ ] **Step 5: Viết `app/api/books/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const status = req.nextUrl.searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { author: { contains: q, mode: "insensitive" } },
      { isbn: { contains: q } },
    ];
  }
  if (status) where.status = status;
  const books = await prisma.book.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { purchase: true },
  });
  return NextResponse.json(books);
}

export async function POST(req: Request) {
  const body = await req.json();
  const book = await prisma.book.create({
    data: {
      title: String(body.title ?? ""),
      isbn: body.isbn ?? null,
      barcode: body.barcode ?? null,
      author: body.author ?? null,
      category: body.category ?? null,
      condition: body.condition ?? null,
      weightGrams: body.weightGrams ? Number(body.weightGrams) : null,
      coverPhotoUrl: body.coverPhotoUrl ?? null,
      defectsNote: body.defectsNote ?? null,
      purchaseId: body.purchaseId ?? null,
      purchaseCostVnd: body.purchaseCostVnd ? Number(body.purchaseCostVnd) : null,
      listPriceVnd: body.listPriceVnd ? Number(body.listPriceVnd) : null,
      status: body.status ?? "INTAKE",
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(book, { status: 201 });
}
```

- [ ] **Step 6: Viết `app/api/books/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of [
    "title", "isbn", "barcode", "author", "category", "condition",
    "defectsNote", "purchaseId", "soldChannel", "soldOrderId", "notes",
  ]) {
    if (key in body) data[key] = body[key];
  }
  for (const key of ["weightGrams", "purchaseCostVnd", "listPriceVnd", "soldPriceVnd"]) {
    if (key in body) data[key] = body[key] ? Number(body[key]) : null;
  }
  if ("status" in body) data.status = body.status;
  if (body.status === "SOLD") {
    data.soldDate = body.soldDate ? new Date(body.soldDate) : new Date();
  }
  if (body.status && body.status !== "SOLD") data.soldDate = null;
  const book = await prisma.book.update({ where: { id }, data });
  return NextResponse.json(book);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.book.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: Viết `app/api/stats/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeStats } from "@/lib/stats";

export async function GET() {
  const [books, expenses] = await Promise.all([
    prisma.book.findMany(),
    prisma.expense.findMany(),
  ]);
  return NextResponse.json({ status: "ok", data: computeStats(books, expenses) });
}
```

- [ ] **Step 8: Build + commit**

Chạy: `npm run build` → PASS. (Route có DB nên chỉ cần build pass; test logic nằm ở `computeStats`.)

```bash
git add lib/stats.ts app/api/books app/api/stats tests/stats.test.ts
git commit -m "feat: books crud api + stats"
```

---

### Task 9: Trang Kho sách (danh sách + lọc + sửa/đánh dấu bán/xóa)

**Files:**
- Create: `app/books/page.tsx`, `app/books/BookListClient.tsx`, `app/books/BookEditForm.tsx`

**Interfaces:**
- Consumes: `GET/POST/PATCH/DELETE /api/books` (Task 8).
- Produces: trang `/books` cho phép lọc, sửa, đánh dấu SOLD, xóa.

- [ ] **Step 1: Viết `app/books/page.tsx`** (server component — lấy danh sách ban đầu)

```tsx
import { prisma } from "@/lib/prisma";
import BookListClient from "./BookListClient";

export const dynamic = "force-dynamic";

export default async function BooksPage() {
  const books = await prisma.book.findMany({
    orderBy: { createdAt: "desc" },
    include: { purchase: true },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Kho sách</h1>
      <BookListClient initialBooks={books} />
    </div>
  );
}
```

- [ ] **Step 2: Viết `app/books/BookListClient.tsx`** (client — tìm kiếm, filter status, bảng, hành động)

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Purchase = { id: string; supplier: string; date: string } | null;
export type BookRow = {
  id: string;
  isbn: string | null;
  title: string;
  author: string | null;
  category: string | null;
  condition: string | null;
  coverPhotoUrl: string | null;
  listPriceVnd: number | null;
  purchaseCostVnd: number | null;
  status: string;
  purchase: Purchase;
};

export default function BookListClient({ initialBooks }: { initialBooks: BookRow[] }) {
  const router = useRouter();
  const [books, setBooks] = useState(initialBooks);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<BookRow | null>(null);

  async function search() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const res = await fetch(`/api/books?${params}`);
    setBooks(await res.json());
  }

  async function markSold(book: BookRow) {
    await fetch(`/api/books/${book.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SOLD" }),
    });
    router.refresh();
    search();
  }

  async function remove(book: BookRow) {
    if (!confirm(`Xóa "${book.title}"?`)) return;
    await fetch(`/api/books/${book.id}`, { method: "DELETE" });
    router.refresh();
    search();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Tìm tên / tác giả / ISBN"
          className="rounded border border-slate-300 px-3 py-2"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); }} onBlur={search} className="rounded border border-slate-300 px-3 py-2">
          <option value="">Tất cả</option>
          <option value="INTAKE">Nhập kho</option>
          <option value="LISTED">Đang bán</option>
          <option value="SOLD">Đã bán</option>
        </select>
        <button onClick={search} className="rounded bg-blue-600 px-4 py-2 text-white">Tìm</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <div key={book.id} className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="flex gap-3">
              {book.coverPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.coverPhotoUrl} alt={book.title} className="h-24 w-16 rounded object-cover" />
              ) : (
                <div className="flex h-24 w-16 items-center justify-center rounded bg-slate-200 text-xs text-slate-500">No cover</div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold">{book.title}</p>
                <p className="text-sm text-slate-500">{book.author}</p>
                <p className="text-xs text-slate-400">{book.isbn}</p>
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5">{book.category}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5">{book.condition}</span>
                  <span className={`rounded px-1.5 py-0.5 ${
                    book.status === "SOLD" ? "bg-green-100 text-green-700"
                    : book.status === "LISTED" ? "bg-blue-100 text-blue-700" : "bg-slate-200"
                  }`}>{book.status}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span>Giá bán: {book.listPriceVnd?.toLocaleString("vi-VN") ?? "-"}đ</span>
              <span>Giá nhập: {book.purchaseCostVnd?.toLocaleString("vi-VN") ?? "-"}đ</span>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => setEditing(book)} className="rounded bg-slate-100 px-3 py-1 text-sm">Sửa</button>
              {book.status !== "SOLD" && (
                <button onClick={() => markSold(book)} className="rounded bg-green-600 px-3 py-1 text-sm text-white">Đã bán</button>
              )}
              <button onClick={() => remove(book)} className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">Xóa</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <BookEditForm
          book={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); search(); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Viết `app/books/BookEditForm.tsx`** (client modal — sửa fields chính)

```tsx
"use client";

import { useState } from "react";
import type { BookRow } from "./BookListClient";

const CONDITIONS = ["NEW", "LIKE_NEW", "VG", "GOOD", "FAIR", "POOR"];

export default function BookEditForm({
  book,
  onClose,
  onSaved,
}: {
  book: BookRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: book.title,
    author: book.author ?? "",
    category: book.category ?? "",
    condition: book.condition ?? "VG",
    listPriceVnd: book.listPriceVnd ?? "",
    purchaseCostVnd: book.purchaseCostVnd ?? "",
    notes: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    await fetch(`/api/books/${book.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        author: form.author || null,
        category: form.category || null,
        condition: form.condition,
        listPriceVnd: form.listPriceVnd ? Number(form.listPriceVnd) : null,
        purchaseCostVnd: form.purchaseCostVnd ? Number(form.purchaseCostVnd) : null,
      }),
    });
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md space-y-3 overflow-auto rounded-xl bg-white p-5">
        <h2 className="text-lg font-bold">Sửa sách</h2>
        <input value={form.title} onChange={set("title")} placeholder="Tiêu đề" className="w-full rounded border border-slate-300 px-3 py-2" />
        <input value={form.author} onChange={set("author")} placeholder="Tác giả" className="w-full rounded border border-slate-300 px-3 py-2" />
        <input value={form.category} onChange={set("category")} placeholder="Phân loại" className="w-full rounded border border-slate-300 px-3 py-2" />
        <select value={form.condition} onChange={set("condition")} className="w-full rounded border border-slate-300 px-3 py-2">
          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={form.listPriceVnd} onChange={set("listPriceVnd")} type="number" placeholder="Giá bán (đ)" className="w-full rounded border border-slate-300 px-3 py-2" />
        <input value={form.purchaseCostVnd} onChange={set("purchaseCostVnd")} type="number" placeholder="Giá nhập (đ)" className="w-full rounded border border-slate-300 px-3 py-2" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded bg-slate-200 px-4 py-2">Hủy</button>
          <button onClick={submit} className="rounded bg-blue-600 px-4 py-2 text-white">Lưu</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build + kiểm thử thủ công + commit**

Chạy `npm run build` → PASS. Chạy `npm run dev`, đăng nhập, vào `/books` → thêm sách qua DB/scan (task 10), tìm kiếm, sửa, đánh dấu bán, xóa.

```bash
git add app/books
git commit -m "feat: catalog page"
```

### Task 10: Scan & nhập nhanh (html5-qrcode + form điền sẵn)

**Files:**
- Create: `app/scan/page.tsx`, `app/components/SpeedScanner.tsx`, `app/components/SpeedForm.tsx`

**Interfaces:**
- Consumes: `GET /api/lookup` (Task 7), `POST /api/books` (Task 8), `GET /api/purchases` (Task 11 — dùng trong SpeedForm; nếu chưa có, để trống cho tới Task 11).
- Produces: trang `/scan` — camera quét ISBN → form điền sẵn `BookInfo` → Lưu tạo `Book`.

- [ ] **Step 1: Cài html5-qrcode**

```bash
npm i html5-qrcode
```

- [ ] **Step 2: Viết `app/scan/page.tsx`** (server component — wrap nội dung scan)

```tsx
import SpeedScanner from "@/app/components/SpeedScanner";

export default function ScanPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nhập nhanh</h1>
      <SpeedScanner />
    </div>
  );
}
```

- [ ] **Step 3: Viết `app/components/SpeedScanner.tsx`** (client — camera scan + ISBN tay)

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import SpeedForm from "./SpeedForm";

export type BookInfo = {
  title: string;
  author: string;
  category: string;
  thumbnail: string;
  description: string;
};

export default function SpeedScanner() {
  const [isbn, setIsbn] = useState("");
  const [book, setBook] = useState<BookInfo | null>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  async function lookup(code: string) {
    setError("");
    const res = await fetch(`/api/lookup?isbn=${encodeURIComponent(code)}`);
    const data = await res.json();
    if (res.ok && data.ok && data.book) {
      setBook(data.book);
    } else if (res.status === 400) {
      setError("ISBN không hợp lệ");
    } else {
      setError("Không tìm thấy sách trên Google Books — nhập tay hoặc ISBN khác");
    }
  }

  useEffect(() => {
    let cancelled = false;
    if (!scanning) return;
    const el = document.getElementById("qr-reader");
    if (!el) return;
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 100 } },
        (decodedText) => {
          scanner.stop();
          setScanning(false);
          setIsbn(decodedText.replace(/[- ]/g, ""));
          lookup(decodedText);
        },
        () => {},
      )
      .catch(() => {
        if (!cancelled) setError("Không mở được camera — dùng nhập tay bên dưới");
        setScanning(false);
      });
    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [scanning]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setScanning((s) => !s)}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          {scanning ? "Dừng quét" : book ? "Quét sách mới" : "Mở camera quét"}
        </button>
        <input
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          placeholder="Hoặc nhập ISBN tay"
          onKeyDown={(e) => e.key === "Enter" && isbn && lookup(isbn)}
          className="flex-1 rounded border border-slate-300 px-3 py-2"
        />
        <button onClick={() => isbn && lookup(isbn)} className="rounded bg-slate-100 px-4 py-2">
          Tra sách
        </button>
      </div>

      {scanning && (
        <div className="overflow-hidden rounded-xl border bg-black">
          <div id="qr-reader" className="mx-auto max-w-md" />
        </div>
      )}

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {book && <SpeedForm isbn={isbn} book={book} onReset={() => { setBook(null); setIsbn(""); }} />}
    </div>
  );
}
```

- [ ] **Step 4: Viết `app/components/SpeedForm.tsx`** (client — form điền sẵn, sửa, lưu)

```tsx
"use client";

import { useEffect, useState } from "react";
import type { BookInfo } from "./SpeedScanner";

const CONDITIONS = ["NEW", "LIKE_NEW", "VG", "GOOD", "FAIR", "POOR"];

export default function SpeedForm({
  isbn,
  book,
  onReset,
}: {
  isbn: string;
  book: BookInfo;
  onReset: () => void;
}) {
  const [form, setForm] = useState({
    title: book.title,
    author: book.author,
    category: book.category,
    condition: "VG",
    weightGrams: "",
    purchaseCostVnd: "",
    listPriceVnd: "",
    defectsNote: "",
    purchaseId: "",
  });
  const [purchases, setPurchases] = useState<{ id: string; supplier: string; date: string }[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/purchases")
      .then((r) => r.json())
      .then(setPurchases)
      .catch(() => {});
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setError("");
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isbn,
        title: form.title,
        author: form.author || null,
        category: form.category || null,
        condition: form.condition,
        weightGrams: form.weightGrams ? Number(form.weightGrams) : null,
        purchaseCostVnd: form.purchaseCostVnd ? Number(form.purchaseCostVnd) : null,
        listPriceVnd: form.listPriceVnd ? Number(form.listPriceVnd) : null,
        defectsNote: form.defectsNote || null,
        purchaseId: form.purchaseId || null,
        status: "LISTED",
        coverPhotoUrl: book.thumbnail || null,
      }),
    });
    if (res.ok) {
      setSaved(true);
    } else {
      const data = await res.json();
      setError(data.error ?? "Lưu thất bại");
    }
  }

  if (saved) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
        <p className="mb-2 font-semibold text-green-700">Đã lưu: {form.title}</p>
        <button onClick={onReset} className="rounded bg-blue-600 px-4 py-2 text-white">Thêm cuốn khác</button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
      <div className="sm:col-span-2 flex gap-4">
        {book.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.thumbnail} alt={book.title} className="h-32 w-24 rounded object-cover" />
        )}
        <div>
          <p className="text-lg font-bold">{book.title}</p>
          <p className="text-sm text-slate-500">{book.author}</p>
          <p className="text-xs text-slate-400">ISBN: {isbn}</p>
        </div>
      </div>
      <label className="contents">
        <input value={form.title} onChange={set("title")} required className="sm:col-span-2 rounded border border-slate-300 px-3 py-2" />
      </label>
      <input value={form.author} onChange={set("author")} placeholder="Tác giả" className="rounded border border-slate-300 px-3 py-2" />
      <input value={form.category} onChange={set("category")} placeholder="Phân loại" className="rounded border border-slate-300 px-3 py-2" />
      <select value={form.condition} onChange={set("condition")} className="rounded border border-slate-300 px-3 py-2">
        {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={form.purchaseId} onChange={set("purchaseId")} className="rounded border border-slate-300 px-3 py-2">
        <option value="">— Lô nhập (nếu có) —</option>
        {purchases.map((p) => (
          <option key={p.id} value={p.id}>{p.supplier} · {new Date(p.date).toLocaleDateString("vi-VN")}</option>
        ))}
      </select>
      <input value={form.weightGrams} onChange={set("weightGrams")} type="number" placeholder="Khối lượng (g)" className="rounded border border-slate-300 px-3 py-2" />
      <input value={form.purchaseCostVnd} onChange={set("purchaseCostVnd")} type="number" placeholder="Giá nhập (đ)" className="rounded border border-slate-300 px-3 py-2" />
      <input value={form.listPriceVnd} onChange={set("listPriceVnd")} type="number" placeholder="Giá bán (đ)" className="rounded border border-slate-300 px-3 py-2" />
      <input value={form.defectsNote} onChange={set("defectsNote")} placeholder="Lỗi / ghi chú (vd góc cong nhẹ)" className="sm:col-span-2 rounded border border-slate-300 px-3 py-2" />
      {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button type="button" onClick={onReset} className="rounded bg-slate-200 px-4 py-2">Hủy</button>
        <button type="submit" className="rounded bg-blue-600 px-6 py-2 text-white">Lưu vào kho</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Build + kiểm thử thủ công**

Chạy `npm run build` → PASS. Chạy `npm run dev`, vào `/scan` → bấm nút mở camera, chụp mã vạch sách có ISBN (vd Sapiens `9780062316097`) → form điền sẵn title/author/bìa → sửa giá → Lưu → về `/books` thấy cuốn đã lưu.

Lưu ý: camera chỉ hoạt động với HTTPS hoặc `localhost`. Trên điện thoại dùng URL Vercel (Task 16).

- [ ] **Step 6: Commit**

```bash
git add app/scan app/components/SpeedScanner.tsx app/components/SpeedForm.tsx package.json package-lock.json
git commit -m "feat: scan isbn + quick intake form"
```

### Task 11: Nhập hàng (Purchases) — API + trang

**Files:**
- Create: `app/api/purchases/route.ts`, `app/purchases/page.tsx`, `app/purchases/PurchaseListClient.tsx`

**Interfaces:**
- Consumes: `prisma` (Task 2).
- Produces: `GET /api/purchases` → `Purchase[]` (kèm `_count.books`) theo `createdAt desc`; `POST /api/purchases` body `{date, supplier, totalCost, note?}` → `201`.

- [ ] **Step 1: Viết `app/api/purchases/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { books: true } } },
  });
  return NextResponse.json(purchases);
}

export async function POST(req: Request) {
  const body = await req.json();
  const purchase = await prisma.purchase.create({
    data: {
      date: body.date ? new Date(body.date) : new Date(),
      supplier: String(body.supplier ?? ""),
      totalCost: Number(body.totalCost ?? 0),
      note: body.note ?? null,
    },
  });
  return NextResponse.json(purchase, { status: 201 });
}
```

- [ ] **Step 2: Viết `app/purchases/page.tsx`** (server)

```tsx
import { prisma } from "@/lib/prisma";
import PurchaseListClient from "./PurchaseListClient";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { books: true } }, books: { select: { id: true, title: true } } },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nhập hàng</h1>
      <PurchaseListClient initialPurchases={purchases} />
    </div>
  );
}
```

- [ ] **Step 3: Viết `app/purchases/PurchaseListClient.tsx`** (client — form tạo lô + list)

```tsx
"use client";

import { useState } from "react";

type PurchaseRow = {
  id: string;
  date: string;
  supplier: string;
  totalCost: number;
  note: string | null;
  _count: { books: number };
  books: { id: string; title: string }[];
};

export default function PurchaseListClient({ initialPurchases }: { initialPurchases: PurchaseRow[] }) {
  const [purchases, setPurchases] = useState(initialPurchases);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), supplier: "", totalCost: "" });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, totalCost: Number(form.totalCost || 0) }),
    });
    if (res.ok) {
      const created = await res.json();
      setPurchases((list) => [{ ...created, _count: { books: 0 }, books: [] }, ...list]);
      setForm({ date: new Date().toISOString().slice(0, 10), supplier: "", totalCost: "" });
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4">
        <label className="flex flex-col text-sm">
          Ngày
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-1 flex-col text-sm">
          Nhà cung cấp
          <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} required className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">
          Tổng chi (đ)
          <input type="number" value={form.totalCost} onChange={(e) => setForm({ ...form, totalCost: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <button className="rounded bg-blue-600 px-4 py-2 text-white">Thêm lô</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {purchases.map((p) => (
          <div key={p.id} className="rounded-xl border bg-white p-4">
            <div className="flex justify-between">
              <p className="font-semibold">{p.supplier}</p>
              <span className="text-sm text-slate-500">{new Date(p.date).toLocaleDateString("vi-VN")}</span>
            </div>
            <p className="mt-1 text-sm">Tổng chi: {p.totalCost.toLocaleString("vi-VN")}đ</p>
            <p className="text-sm text-slate-500">{p._count.books} cuốn</p>
            {p.books.length > 0 && (
              <ul className="mt-2 max-h-24 overflow-auto border-t pt-2 text-xs text-slate-600">
                {p.books.map((b) => <li key={b.id}>{b.title}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build + kiểm thử thủ công + commit**

Chạy `npm run build` → PASS. Vào `/purchases` → tạo lô → sách quét ở Task 10 chọn được lô này.

```bash
git add app/api/purchases app/purchases
git commit -m "feat: purchases module"
```

---

### Task 12: Bán hàng (Orders) — API + trang

**Files:**
- Create: `app/api/orders/route.ts`, `app/api/orders/[id]/route.ts`, `app/orders/page.tsx`, `app/orders/OrderClient.tsx`

**Interfaces:**
- Consumes: `prisma` (Task 2).
- Produces: `GET /api/orders` → `Order[]` desc; `POST /api/orders` `{date, channel?, totalVnd?, note?}` → `201`; `DELETE /api/orders/[id]` → `{ok:true}`.

- [ ] **Step 1: Viết `app/api/orders/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const body = await req.json();
  const order = await prisma.order.create({
    data: {
      date: body.date ? new Date(body.date) : new Date(),
      channel: body.channel ?? null,
      totalVnd: body.totalVnd ? Number(body.totalVnd) : null,
      note: body.note ?? null,
    },
  });
  return NextResponse.json(order, { status: 201 });
}
```

- [ ] **Step 2: Viết `app/api/orders/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Viết `app/orders/page.tsx`** (server)

```tsx
import { prisma } from "@/lib/prisma";
import OrderClient from "./OrderClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bán hàng</h1>
      <OrderClient initialOrders={orders} />
    </div>
  );
}
```

- [ ] **Step 4: Viết `app/orders/OrderClient.tsx`** (client — tạo + xóa đơn)

```tsx
"use client";

import { useState } from "react";

type OrderRow = { id: string; date: string; channel: string | null; totalVnd: number | null; note: string | null };

export default function OrderClient({ initialOrders }: { initialOrders: OrderRow[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), channel: "", totalVnd: "" });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, totalVnd: form.totalVnd ? Number(form.totalVnd) : null }),
    });
    if (res.ok) {
      setOrders((list) => [await res.json(), ...list]);
      setForm({ date: new Date().toISOString().slice(0, 10), channel: "", totalVnd: "" });
    }
  }

  async function remove(o: OrderRow) {
    if (!confirm("Xóa đơn?")) return;
    await fetch(`/api/orders/${o.id}`, { method: "DELETE" });
    setOrders((list) => list.filter((x) => x.id !== o.id));
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4">
        <label className="flex flex-col text-sm">
          Ngày
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">
          Kênh
          <input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} placeholder="Chợ Tốt / Shopee /..." className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">
          Tổng thu (đ)
          <input type="number" value={form.totalVnd} onChange={(e) => setForm({ ...form, totalVnd: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <button className="rounded bg-blue-600 px-4 py-2 text-white">Ghi đơn</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
            <div>
              <p className="font-semibold">{o.channel ?? "Không kênh"}</p>
              <p className="text-sm text-slate-500">{new Date(o.date).toLocaleDateString("vi-VN")}</p>
              {o.totalVnd != null && <p className="mt-1 text-sm">{o.totalVnd.toLocaleString("vi-VN")}đ</p>}
            </div>
            <button onClick={() => remove(o)} className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">Xóa</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Build + kiểm thử thủ công + commit**

Chạy `npm run build` → PASS. Vào `/orders` → ghi/xóa đơn.

```bash
git add app/api/orders app/orders
git commit -m "feat: orders module"
```

---

### Task 13: Chi phí (Expenses) — API + trang + Dashboard

**Files:**
- Create: `app/api/expenses/route.ts`, `app/api/expenses/[id]/route.ts`, `app/expenses/page.tsx`, `app/expenses/ExpenseClient.tsx`, `app/page.tsx`
- Modify: `app/layout.tsx` (đổi title metadata — đã có)

**Interfaces:**
- Consumes: `prisma` (Task 2), `computeStats` (Task 8), `GET /api/stats` (Task 8).
- Produces: `GET/POST /api/expenses` (body `{date, category, amountVnd, note?}`), `DELETE /api/expenses/[id]`; trang `/` hiển thị stats.

- [ ] **Step 1: Viết `app/api/expenses/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(expenses);
}

export async function POST(req: Request) {
  const body = await req.json();
  const expense = await prisma.expense.create({
    data: {
      date: body.date ? new Date(body.date) : new Date(),
      category: String(body.category ?? ""),
      amountVnd: Number(body.amountVnd ?? 0),
      note: body.note ?? null,
    },
  });
  return NextResponse.json(expense, { status: 201 });
}
```

- [ ] **Step 2: Viết `app/api/expenses/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Viết `app/expenses/page.tsx`** (server) + `app/expenses/ExpenseClient.tsx` (client)

`app/expenses/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import ExpenseClient from "./ExpenseClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Chi phí</h1>
      <ExpenseClient initialExpenses={expenses} />
    </div>
  );
}
```

`app/expenses/ExpenseClient.tsx`:

```tsx
"use client";

import { useState } from "react";

type ExpenseRow = { id: string; date: string; category: string; amountVnd: number; note: string | null };

const CATEGORIES = ["Vận chuyển", "Đóng gói", "Phí nền tảng", "Khác"];

export default function ExpenseClient({ initialExpenses }: { initialExpenses: ExpenseRow[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: "Vận chuyển", amountVnd: "" });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amountVnd: Number(form.amountVnd || 0) }),
    });
    if (res.ok) {
      setExpenses((list) => [await res.json(), ...list]);
      setForm({ date: new Date().toISOString().slice(0, 10), category: "Vận chuyển", amountVnd: "" });
    }
  }

  async function remove(x: ExpenseRow) {
    if (!confirm("Xóa chi phí?")) return;
    await fetch(`/api/expenses/${x.id}`, { method: "DELETE" });
    setExpenses((list) => list.filter((e) => e.id !== x.id));
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4">
        <label className="flex flex-col text-sm">
          Ngày
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col text-sm">
          Loại
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded border border-slate-300 px-3 py-2">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Số tiền (đ)
          <input type="number" value={form.amountVnd} onChange={(e) => setForm({ ...form, amountVnd: e.target.value })} required className="rounded border border-slate-300 px-3 py-2" />
        </label>
        <button className="rounded bg-blue-600 px-4 py-2 text-white">Thêm</button>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr><th className="px-3 py-2">Ngày</th><th className="px-3 py-2">Loại</th><th className="px-3 py-2">Số tiền</th><th /></tr>
          </thead>
          <tbody>
            {expenses.map((x) => (
              <tr key={x.id} className="border-t">
                <td className="px-3 py-2">{new Date(x.date).toLocaleDateString("vi-VN")}</td>
                <td className="px-3 py-2">{x.category}</td>
                <td className="px-3 py-2">{x.amountVnd.toLocaleString("vi-VN")}đ</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => remove(x)} className="rounded bg-red-100 px-2 py-1 text-red-700">Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Viết Dashboard `app/page.tsx`** (server — đọc stats)

```tsx
import { prisma } from "@/lib/prisma";
import { computeStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
const fmt = (n: number) => n.toLocaleString("vi-VN");

export default async function DashboardPage() {
  const [books, expenses] = await Promise.all([
    prisma.book.findMany(),
    prisma.expense.findMany(),
  ]);
  const s = computeStats(books, expenses);
  const cards = [
    { label: "Sách tồn kho", value: String(s.inStock) },
    { label: "Đã bán", value: String(s.sold) },
    { label: "Doanh thu", value: fmt(s.revenue) + "đ" },
    { label: "Chi phí", value: fmt(s.cost) + "đ" },
    { label: "Lợi nhuận", value: fmt(s.profit) + "đ" },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-white p-4">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Build + kiểm thử thủ công + commit**

Chạy `npm run build` → PASS. Vào `/` thấy 5 chỉ số cập nhật theo dữ liệu.

```bash
git add app/api/expenses app/expenses app/page.tsx
git commit -m "feat: expenses module + dashboard"
```

### Task 14: Migrate dữ liệu GSheet → Neon (1 lần)

**Files:**
- Modify: `/tmp/opencode/clasp-sachcu/02-Apps-Script.gs` (thêm hàm export JSON)
- Create: `/tmp/opencode/book-migrate/export.sh`, `/tmp/opencode/book-migrate/import.mjs`

**Interfaces:**
- Consumes: Apps Script project của GSheet (script id `1Ow5qCZgMcVk5N45wDw3Hy7aVy79k3jbaa285dWsSujMoJAC7G-3lmurK`), Neon `DATABASE_URL` (Task 2), Prisma schema (Task 2).
- Produces: toàn bộ dữ liệu 4 tab GSheet được nhập vào Neon.

- [ ] **Step 1: Thêm hàm export vào Apps Script**

Trong `/tmp/opencode/clasp-sachcu/02-Apps-Script.gs`, thêm hàm:

```js
function doGetExport() {
  const sheetName = 'Catalog'; // Purchases | Catalog | Orders | Expenses
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  return values.map((row) => row.map((cell) =>
    cell instanceof Date ? cell.toISOString() : cell));
}
```

Và trong `doGet(e)` thêm nhánh đầu:

```js
if (e.parameter.export === '1') {
  const out = ContentService.createTextOutput()
    .setMimeType(ContentService.MimeType.JSON);
  return out.setContent(JSON.stringify(doGetExport()));
}
```

Deploy lại bản nháp: `clasp push && clasp deploy -d "migrate export"` (từ `/tmp/opencode/clasp-sachcu`). Ghi lại exec URL mới.

- [ ] **Step 2: Viết script export — `/tmp/opencode/book-migrate/export.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${EXPORT_URL:?set EXPORT_URL}"
mkdir -p data
for sheet in Purchases Catalog Orders Expenses; do
  curl -s "${BASE_URL}?export=1&sheet=${sheet}" > "data/${sheet}.json"
  echo "exported ${sheet}"
done
```

Chạy: `EXPORT_URL=<exec_url> bash export.sh`. Kiểm tra `data/*.json` có dữ liệu.

- [ ] **Step 3: Viết script import — `/tmp/opencode/book-migrate/import.mjs`**

```js
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const prisma = new PrismaClient();
const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => JSON.parse(readFileSync(path.join(dir, "data", `${name}.json`), "utf8"));

async function importBooks(rows) {
  const header = rows[0];
  const idx = Object.fromEntries(header.map((h, i) => [String(h).trim().toLowerCase(), i]));
  const bookRows = rows.slice(1).filter((r) => r[idx.title]);
  const existing = await prisma.book.count();
  if (existing > 0 && bookRows.length > 0) {
    console.log(`SKIP Book: DB đã có ${existing} cuốn, bỏ qua import ${bookRows.length} dòng hoặc tự cân nhắc.`);
  }
  for (const r of bookRows) {
    const num = (k) => { const v = r[idx[k]]; return v == null || v === "#N/A" || v === "" ? null : Number(v); };
    const str = (k) => { const v = r[idx[k]]; return v == null || v === "#N/A" ? null : String(v); };
    await prisma.book.upsert({
      where: { id: "mig-" + r[idx.book_id] },
      create: {
        id: "mig-" + r[idx.book_id],
        isbn: str("isbn"), barcode: str("barcode"),
        title: String(r[idx.title]),
        author: str("author"), category: str("category"), condition: str("condition"),
        weightGrams: num("weight_grams"), coverPhotoUrl: str("cover_photo_url"),
        defectsNote: str("defects_note"), purchaseCostVnd: num("purchase_cost_vnd"),
        listPriceVnd: num("list_price_vnd"), status: (str("status") || "INTAKE"),
        soldPriceVnd: num("sold_price_vnd"), soldChannel: str("sold_channel"),
        soldOrderId: str("sold_order_id"), notes: str("notes"),
      },
      update: {},
    });
  }
  console.log(`Book: imported ${bookRows.length}`);
}

async function importPurchases(rows) { /* tương tự: đủ cột trong GSheet tab Purchases */ }
async function importOrders(rows) { /* tương tự */ }
async function importExpenses(rows) { /* tương tự */ }

await importBooks(read("Catalog"));
await importPurchases(read("Purchases"));
await importOrders(read("Orders"));
await importExpenses(read("Expenses"));
await prisma.$disconnect();
```

> Lưu ý: khi implement, đọc header thực tế của từng tab trong `data/*.json` và điền đúng tên cột vào `import.mjs` (đặc biệt tab Orders có 24 cột A–X). Mảng `idx` map theo header động nên chỉ cần tên cột chính xác.

- [ ] **Step 4: Chạy import**

Từ `/home/kabe/book_manager`: `node /tmp/opencode/book-migrate/import.mjs` (cần `node_modules` Prisma của project — chạy với `NODE_PATH` hoặc copy script vào `scripts/`).

- [ ] **Step 5: Xác minh khớp dữ liệu**

```bash
npm run dev
```

So sánh: số cuốn ở `/books` = số dòng Catalog trong GSheet; tổng tiền Dashboard khớp tay. Nếu lệch, sửa `import.mjs` và chạy lại (upsert id `mig-*` nên idempotent).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: migrate gsheet to neon"
```

---

### Task 15: Tạo GitHub repo + push

**Files:**
- Không có (chỉ git/gh).

**Interfaces:**
- Consumes: repo local `book_manager` (toàn bộ task trước).
- Produces: remote `github.com/TuongKabe/book_manager` (private).

- [ ] **Step 1: Tạo repo private và push**

```bash
cd /home/kabe/book_manager
gh repo create TuongKabe/book_manager --private --source . --remote origin --push
```

- [ ] **Step 2: Xác minh**

```bash
git remote -v
gh repo view TuongKabe/book_manager
```

Kỳ vọng: remote trỏ đúng, code trên GitHub đủ commit.

---

### Task 16: Deploy Vercel

**Files:**
- Không có (cấu hình trên Vercel dashboard/CLI).

**Interfaces:**
- Consumes: repo GitHub (Task 15), env vars.
- Produces: webapp live tại `https://<project>.vercel.app` với HTTPS (đủ cho camera scan trên điện thoại).

- [ ] **Step 1: Cài vercel CLI + login (cần user)**

```bash
npm i -g vercel
vercel login
```

User mở link, đăng nhập Vercel (có thể dùng GitHub account).

- [ ] **Step 2: Link + tạo env**

```bash
cd /home/kabe/book_manager
vercel link --yes
vercel env add DATABASE_URL production
vercel env add PASSCODE production
vercel env add GOOGLE_BOOKS_API_KEY production
```

Nhập đúng giá trị (DATABASE_URL = Neon string, PASSCODE giống `.env`, key Google Books).

- [ ] **Step 3: Deploy**

```bash
vercel --prod
```

- [ ] **Step 4: Kiểm thử toàn diện trên production**

- Mở URL, đăng nhập passcode → dashboard ra số liệu (nếu đã migrate Task 14).
- Vào `/scan` trên **điện thoại** (HTTP/2, HTTPS) → mở camera quét ISBN sách thật → form điền sẵn → Lưu.
- Vào `/books` → sửa / đánh dấu SOLD / xóa hoạt động.
- `/purchases`, `/orders`, `/expenses` ghi dữ liệu, Dashboard cập nhật.
- Kiểm tra `https://<project>.vercel.app/api/lookup?isbn=9781539412335` trả `{ok:true,...}`.

- [ ] **Step 5: (Tùy chọn) Đổi tên project / bảo mật**

```bash
vercel project ls
```

Ghi nhận: passcode là chặn duy nhất — đổi `PASSCODE` trong Vercel env khi cần, redeploy.

---

## Self-Review Notes

- **Spec coverage:** mọi mục trong spec (kiến trúc, schema 4 bảng, auth, nav responsive, flow scan, migrate, deploy, test) đều có task tương ứng.
- **Todo còn hỏi user:** tạo Neon project + dán DATABASE_URL (Task 2 Step 5); đặt PASSCODE (Task 5 Step 8); vercel login (Task 16 Step 1).