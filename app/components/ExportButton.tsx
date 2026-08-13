"use client";

import { useSearchParams } from "next/navigation";
import { DownloadSimple } from "@phosphor-icons/react";
import Button from "./ui/Button";

export default function ExportButton({
  path,
  label = "Xuất CSV",
  variant = "secondary",
}: {
  path: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const href = qs ? `${path}?${qs}` : path;
  return (
    <a href={href} download>
      <Button variant={variant} iconLeft={<DownloadSimple size={14} weight="bold" />}>
        {label}
      </Button>
    </a>
  );
}
