"use client";

import { usePathname } from "next/navigation";
import Nav from "./Nav";

export default function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        {children}
      </main>
    );
  }

  return (
    <>
      <Nav />
      <div className="md:pl-52">
        <main className="mx-auto max-w-5xl p-4 pb-20 md:p-8">{children}</main>
      </div>
    </>
  );
}
