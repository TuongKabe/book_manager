"use client";

import { useState } from "react";
import { Camera } from "@phosphor-icons/react";
import ISBNScanner from "./ISBNScanner";
import SpeedForm from "./SpeedForm";
import PageHeader from "./ui/PageHeader";

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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nhập nhanh"
        description="Quét ISBN bằng camera hoặc nhập tay để thêm nhanh sách vào kho."
      />

      <div className="rounded-lg border border-hairline bg-surface p-4 shadow-xs">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-ink-muted">
          <Camera size={16} weight="bold" className="text-brand" />
          Quét ISBN
        </div>
        <ISBNScanner
          onFound={(code, info) => {
            setIsbn(code);
            setBook(info);
          }}
        />
      </div>

      {book && (
        <SpeedForm
          isbn={isbn}
          book={book}
          onReset={() => {
            setBook(null);
            setIsbn("");
          }}
        />
      )}
    </div>
  );
}
