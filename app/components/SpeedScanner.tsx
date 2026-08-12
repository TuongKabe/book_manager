"use client";

import { useState } from "react";
import ISBNScanner from "./ISBNScanner";
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

  return (
    <div className="space-y-4">
      <ISBNScanner
        onFound={(code, info) => {
          setIsbn(code);
          setBook(info);
        }}
      />

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
