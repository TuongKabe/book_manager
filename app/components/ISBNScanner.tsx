"use client";

import { useEffect, useRef, useState, useId } from "react";
import type { Html5Qrcode } from "html5-qrcode";

type BookInfo = {
  title: string;
  author: string;
  category: string;
  thumbnail: string;
  description: string;
};

export default function ISBNScanner({
  onFound,
  onManualSubmit,
}: {
  onFound: (isbn: string, book: BookInfo) => void;
  onManualSubmit?: (isbn: string) => void;
}) {
  const [isbn, setIsbn] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [looking, setLooking] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const rawId = useId();
  const containerId = `scanner-${rawId.replace(/:/g, "")}`;

  async function lookup(code: string) {
    setError("");
    setLooking(true);
    try {
      const res = await fetch(`/api/lookup?isbn=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (res.ok && data.ok && data.book) {
        onFound(code, data.book);
      } else if (res.status === 400) {
        setError("ISBN không hợp lệ");
      } else {
        setError("Không tìm thấy trên Google Books — nhập tay hoặc thử ISBN khác");
      }
    } catch {
      setError("Lỗi kết nối — thử lại");
    }
    setLooking(false);
  }

  function handleManual() {
    const clean = isbn.replace(/[- ]/g, "");
    if (!clean) return;
    if (onManualSubmit) {
      onManualSubmit(clean);
    } else {
      lookup(clean);
    }
  }

  useEffect(() => {
    let cancelled = false;
    if (!scanning) return;
    const el = document.getElementById(containerId);
    if (!el) return;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },
            aspectRatio: 1.5,
          },
          (decodedText) => {
            scanner.stop().catch(() => {});
            setScanning(false);
            const clean = decodedText.replace(/[- ]/g, "");
            setIsbn(clean);
            lookup(clean);
          },
          () => {},
        );
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
          setError("Camera bị từ chối — cho phép quyền camera trong trình duyệt");
        } else if (msg.includes("NotFoundError") || msg.includes("DevicesNotFound")) {
          setError("Không tìm thấy camera — kiểm tra thiết bị");
        } else {
          setError("Không mở được camera — nhập ISBN tay bên dưới");
        }
        setScanning(false);
      }
    })();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning, containerId]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setError("");
            setScanning((s) => !s);
          }}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
        >
          {scanning ? "Dừng quét" : "📷 Quét barcode"}
        </button>
        <div className="flex flex-1 items-center gap-2">
          <input
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManual()}
            placeholder="Hoặc nhập ISBN tay"
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleManual}
            disabled={!isbn || looking}
            className="rounded bg-slate-100 px-3 py-2 text-sm disabled:opacity-50"
          >
            {looking ? "..." : "Tra"}
          </button>
        </div>
      </div>

      {scanning && (
        <div className="overflow-hidden rounded-xl border bg-black">
          <div id={containerId} className="mx-auto max-w-md" />
          <p className="p-2 text-center text-xs text-slate-400">
            Hướng camera vào barcode/ISBN trên bìa sách
          </p>
        </div>
      )}

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {looking && (
        <p className="text-sm text-blue-600">Đang tra cứu sách...</p>
      )}
    </div>
  );
}
