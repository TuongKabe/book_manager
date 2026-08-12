"use client";

import { useEffect, useId, useRef, useState } from "react";
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
}: {
  onFound: (isbn: string, book: BookInfo) => void;
}) {
  const [isbn, setIsbn] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [looking, setLooking] = useState(false);
  const [cameraSupported, setCameraSupported] = useState<boolean | null>(null);

  const rawId = useId();
  const containerId = `scanner-${rawId.replace(/:/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onFoundRef = useRef(onFound);
  const processingRef = useRef(false);

  useEffect(() => { onFoundRef.current = onFound; });

  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => { if (!cancelled) setCameraSupported(false); });
      return () => { cancelled = true; };
    }
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        if (cancelled) return;
        setCameraSupported(devices.some((d) => d.kind === "videoinput"));
      })
      .catch(() => { if (!cancelled) setCameraSupported(true); });
    return () => { cancelled = true; };
  }, []);

  async function lookup(code: string) {
    if (processingRef.current) return;
    processingRef.current = true;
    setError("");
    setLooking(true);
    try {
      const res = await fetch(`/api/lookup?isbn=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (res.ok && data.ok && data.book) {
        onFoundRef.current(code, data.book);
      } else if (res.status === 400) {
        setError("ISBN không hợp lệ");
      } else {
        setError("Không tìm thấy trên Google Books — nhập tay hoặc thử ISBN khác");
      }
    } catch {
      setError("Lỗi kết nối — thử lại");
    }
    setLooking(false);
    processingRef.current = false;
  }

  function handleManual() {
    const clean = isbn.replace(/[- ]/g, "");
    if (!clean) return;
    lookup(clean);
  }

  function handleScan(decodedText: string) {
    if (!scannerRef.current) return;
    const clean = decodedText.replace(/[- ]/g, "");
    setIsbn(clean);
    const s = scannerRef.current;
    scannerRef.current = null;
    s.stop().catch(() => {});
    try { s.clear(); } catch {}
    setScanning(false);
    lookup(clean);
  }

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || !document.getElementById(containerId)) return;

        const scanner = new Html5Qrcode(containerId);
        if (cancelled) {
          try { scanner.clear(); } catch {}
          return;
        }
        scannerRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: (vw: number, vh: number) => {
            const w = Math.min(vw * 0.85, 600);
            const h = Math.min(w * 0.5, vh * 0.5);
            return { width: Math.floor(w), height: Math.floor(h) };
          },
        };

        const constraints = [
          { facingMode: "environment" },
          { facingMode: { ideal: "environment" } },
          true,
        ] as const;

        let lastErr: unknown = null;
        for (const c of constraints) {
          if (cancelled) return;
          try {
            await scanner.start(c as never, config, handleScan, () => {});
            return;
          } catch (e) {
            lastErr = e;
          }
        }
        throw lastErr;
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
          setError("Camera bị từ chối — cho phép quyền camera trong cài đặt trình duyệt");
        } else if (msg.includes("NotFoundError") || msg.includes("DevicesNotFound")) {
          setError("Không tìm thấy camera trên thiết bị");
        } else if (msg.includes("NotReadableError") || msg.includes("TrackStartError")) {
          setError("Camera đang được dùng bởi ứng dụng khác");
        } else if (msg.includes("OverconstrainedError") || msg.includes("ConstraintNotSatisfiedError")) {
          setError("Camera không hỗ trợ cấu hình yêu cầu");
        } else {
          setError(`Không mở được camera: ${msg}`);
        }
        setScanning(false);
        scannerRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop().catch(() => {});
        try { s.clear(); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning, containerId]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {cameraSupported !== false && (
          <button
            onClick={() => { setError(""); setScanning((s) => !s); }}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white"
          >
            {scanning ? "Dừng quét" : "📷 Quét barcode"}
          </button>
        )}
        <div className="flex flex-1 items-center gap-2">
          <input
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManual()}
            placeholder="Hoặc nhập ISBN/Barcode tay rồi bấm Tra"
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

      {cameraSupported === false && (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Thiết bị không có camera — nhập ISBN tay bên trên
        </p>
      )}

      {scanning && cameraSupported !== false && (
        <div className="overflow-hidden rounded-xl border bg-black">
          <div
            ref={containerRef}
            id={containerId}
            className="mx-auto w-full max-w-md"
            style={{ minHeight: "300px" }}
          />
          <p className="p-2 text-center text-xs text-slate-400">
            Hướng camera vào barcode/ISBN trên bìa sách — giữ chắc tay 5–10s
          </p>
        </div>
      )}

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {looking && <p className="text-sm text-blue-600">Đang tra cứu sách trên Google Books...</p>}
    </div>
  );
}