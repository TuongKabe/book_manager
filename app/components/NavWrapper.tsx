"use client";

import { usePathname } from "next/navigation";
import Nav from "./Nav";

export default function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center p-4">{children}</main>
    );
  }

  return (
    <>
      <Nav />
      <div className="md:pl-[var(--sidebar-w)]">
        <main className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-5 sm:px-6 md:px-8 md:pb-12 md:pt-8">
          {children}
        </main>
      </div>
    </>
  );
}
