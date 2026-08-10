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
        <button
          onClick={logout}
          className="flex flex-col items-center text-xs text-red-500"
        >
          <span className="text-lg">⏻</span>Đăng xuất
        </button>
      </nav>
    </>
  );
}