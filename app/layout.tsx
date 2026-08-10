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