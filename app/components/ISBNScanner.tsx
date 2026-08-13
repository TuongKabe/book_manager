"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { Camera, Stop, MagnifyingGlass, Warning, Spinner } from "@phosphor-icons/react";
import Button from "./ui/Button";
import { Input } from "./ui/Field";
import Banner from "./ui/Banner";

type BookInfo = {
  title: string;
  author: string;
  category: string;
  thumbnail: string;
  description: string;
};

export default function ISBNScanner({
  onFound,
  autoStartKey = 0,
}: {
  onFound: (isbn: string, book: BookInfo) => void;
  autoStartKey?: number;
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

  useEffect(() => {
    onFoundRef.current = onFound;
  });

  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => {
        if (!cancelled) setCameraSupported(false);
      });
      return () => {
        cancelled = true;
      };
    }
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        if (cancelled) return;
        setCameraSupported(devices.some((d) => d.kind === "videoinput"));
      })
      .catch(() => {
        if (!cancelled) setCameraSupported(true);
      });
    return () => {
      cancelled = true;
    };
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

  useEffect(() => {
    if (autoStartKey > 0 && !scanning && cameraSupported !== false) {
      queueMicrotask(() => {
        setError("");
        setScanning(true);
      });
    }
  }, [autoStartKey, scanning, cameraSupported]);

  function handleScan(decodedText: string) {
    if (!scannerRef.current) return;
    const clean = decodedText.replace(/[- ]/g, "");
    setIsbn(clean);
    const s = scannerRef.current;
    scannerRef.current = null;
    s.stop().catch(() => {});
    try {
      s.clear();
    } catch {}
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
          try {
            scanner.clear();
          } catch {}
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
        } else if (
          msg.includes("OverconstrainedError") ||
          msg.includes("ConstraintNotSatisfiedError")
        ) {
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
        try {
          s.clear();
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning, containerId]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {cameraSupported !== false && (
          <Button
            variant={scanning ? "secondary" : "primary"}
            size="md"
            onClick={() => {
              setError("");
              setScanning((s) => !s);
            }}
            iconLeft={
              scanning ? <Stop size={14} weight="bold" /> : <Camera size={14} weight="bold" />
            }
          >
            {scanning ? "Dừng quét" : "Quét barcode"}
          </Button>
        )}
        <div className="relative flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <Input
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManual()}
              placeholder="Hoặc nhập ISBN/Barcode rồi bấm Tra"
              className="pl-8"
            />
          </div>
          <Button variant="secondary" onClick={handleManual} disabled={!isbn || looking}>
            {looking ? (
              <span className="inline-flex items-center gap-1.5">
                <Spinner size={12} /> Đang tra
              </span>
            ) : (
              "Tra"
            )}
          </Button>
        </div>
      </div>

      {cameraSupported === false && (
        <Banner tone="warning">
          <span className="inline-flex items-center gap-1.5">
            <Warning size={14} weight="bold" />
            Thiết bị không có camera — nhập ISBN tay để tra.
          </span>
        </Banner>
      )}

      {scanning && cameraSupported !== false && (
        <div className="overflow-hidden rounded-lg border border-hairline bg-black">
          <div
            ref={containerRef}
            id={containerId}
            className="mx-auto w-full max-w-md"
            style={{ minHeight: "300px" }}
          />
          <p className="bg-ink px-3 py-2 text-center text-[11.5px] text-on-dark/80">
            Hướng camera vào barcode/ISBN trên bìa sách — giữ chắc tay 5–10 giây.
          </p>
        </div>
      )}

      {error && <Banner tone="danger">{error}</Banner>}
      {looking && (
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-info">
          <Spinner size={12} /> Đang tra cứu trên Google Books…
        </span>
      )}
    </div>
  );
}
