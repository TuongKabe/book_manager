"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Books, Lock, ArrowRight } from "@phosphor-icons/react";
import Button from "./ui/Button";
import { Field, Input } from "./ui/Field";

export default function LoginForm() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Mã truy cập không đúng. Vui lòng thử lại.");
      }
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid w-full max-w-md overflow-hidden rounded-2xl border border-hairline bg-surface shadow-lg">
      {/* Brand panel */}
      <div className="flex flex-col gap-3 border-b border-hairline bg-surface-tint px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-on-brand">
            <Books size={20} weight="fill" />
          </span>
          <div>
            <p className="font-tabular text-[15px] font-semibold tracking-tight text-ink">
              BookBase
            </p>
            <p className="text-[12px] text-ink-faint">Quản lý bán sách</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-4 px-6 py-6">
        <div>
          <h1 className="font-tabular text-[22px] font-semibold leading-tight tracking-tight text-ink">
            Đăng nhập
          </h1>
          <p className="mt-1 text-[13px] text-ink-faint">
            Nhập mã truy cập để tiếp tục.
          </p>
        </div>

        <Field label="Mã truy cập" htmlFor="passcode" required>
          <div className="relative">
            <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input
              id="passcode"
              type="password"
              autoFocus
              required
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="••••••••"
              className="pl-8"
            />
          </div>
        </Field>

        {error && (
          <p className="rounded-md border border-transparent bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          full
          loading={submitting}
          iconRight={!submitting ? <ArrowRight size={16} weight="bold" /> : undefined}
        >
          {submitting ? "Đang đăng nhập..." : "Vào"}
        </Button>
      </form>
    </div>
  );
}
