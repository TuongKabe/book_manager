"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  House,
  Books,
  Camera,
  Archive,
  ShoppingBag,
  Receipt,
  SignOut,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";

type IconCmp = ComponentType<IconProps>;

const items: { href: string; label: string; icon: IconCmp }[] = [
  { href: "/", label: "Tổng quan", icon: House },
  { href: "/books", label: "Kho sách", icon: Books },
  { href: "/scan", label: "Nhập nhanh", icon: Camera },
  { href: "/purchases", label: "Nhập hàng", icon: Archive },
  { href: "/orders", label: "Bán hàng", icon: ShoppingBag },
  { href: "/expenses", label: "Chi phí", icon: Receipt },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 hidden w-[var(--sidebar-w)] flex-col border-r border-hairline bg-surface md:flex"
        aria-label="Điều hướng chính"
      >
        {/* Brand */}
        <Link
          href="/"
          className="flex h-[var(--header-h)] items-center gap-2 border-b border-hairline px-4 transition-colors hover:bg-surface-soft"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-on-brand">
            <Books size={16} weight="fill" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            BookBase
          </span>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 overflow-auto px-2.5 py-3">
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={[
                      "group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors",
                      active
                        ? "bg-brand-soft font-medium text-brand"
                        : "text-ink-muted hover:bg-surface-soft hover:text-ink",
                    ].join(" ")}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon
                      size={18}
                      weight={active ? "fill" : "regular"}
                      className={active ? "text-brand" : "text-ink-faint group-hover:text-ink-muted"}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Workspace divider + extra content */}
          <div className="mt-6 px-2.5">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-faint">
              Khác
            </p>
            <div className="mt-2 rounded-md border border-hairline bg-brand-soft p-3 text-[12px] text-ink-muted">
              <p className="font-medium text-brand-deep">Mẹo nhanh</p>
              <p className="mt-0.5 leading-relaxed">
                Dùng trang <strong className="text-ink">Tổng quan</strong> để xem lợi nhuận trong kỳ bất kỳ.
              </p>
            </div>
          </div>
        </nav>

        {/* Footer / logout */}
        <div className="border-t border-hairline p-2.5">
          <button
            onClick={logout}
            className="group flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13.5px] text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <SignOut size={18} className="text-ink-faint group-hover:text-danger" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Điều hướng chính (mobile)"
      >
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-2 pb-1.5"
            >
              <Icon
                size={20}
                weight={active ? "fill" : "regular"}
                className={active ? "text-brand" : "text-ink-faint"}
              />
              <span
                className={[
                  "text-[10px]",
                  active ? "font-semibold text-brand" : "font-medium text-ink-faint",
                ].join(" ")}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={logout}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-2 pb-1.5"
        >
          <SignOut size={20} className="text-ink-faint" />
          <span className="text-[10px] font-medium text-ink-faint">Thoát</span>
        </button>
      </nav>
    </>
  );
}
