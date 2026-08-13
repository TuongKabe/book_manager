import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import NavWrapper from "@/app/components/NavWrapper";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-jb-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sách Cũ — Quản lý bán sách",
  description: "Quản lý kho, đơn hàng và chi phí cho tiệm sách cũ",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${inter.variable} ${jbMono.variable}`}>
      <body>
        <NavWrapper>{children}</NavWrapper>
      </body>
    </html>
  );
}
