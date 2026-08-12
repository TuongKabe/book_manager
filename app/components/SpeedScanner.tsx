"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
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
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const scanner = new Html5Qrcode(el.id);
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 100 } },
          (decodedText) => {
            scanner.stop().catch(() => {});
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
    })();
    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
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
