import type { Metadata } from "next";
import "./globals.css";
import NavWrapper from "@/app/components/NavWrapper";

export const metadata: Metadata = { title: "Sách Cũ Management" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="bg-slate-50">
        <NavWrapper>{children}</NavWrapper>
      </body>
    </html>
  );
}
