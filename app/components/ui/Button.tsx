import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-brand text-on-brand hover:bg-brand-hover shadow-xs",
  secondary:
    "bg-surface text-ink border border-hairline-strong hover:bg-surface-soft",
  ghost:
    "bg-transparent text-ink-muted hover:bg-surface-soft hover:text-ink",
  danger:
    "bg-danger text-white hover:opacity-90 shadow-xs",
  "danger-soft":
    "bg-danger-soft text-danger hover:bg-danger-tint",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-md",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-lg",
};

export default function Button({
  variant = "secondary",
  size = "md",
  full = false,
  loading = false,
  iconLeft,
  iconRight,
  disabled,
  children,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center font-medium",
        "transition-[background-color,transform,box-shadow,opacity] duration-150 ease-out",
        "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        full ? "w-full" : "",
        className,
      ].join(" ")}
    >
      {iconLeft && <span className="-ml-0.5 inline-flex shrink-0">{iconLeft}</span>}
      {loading ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-r-transparent" />
      ) : (
        children
      )}
      {iconRight && <span className="-mr-0.5 inline-flex shrink-0">{iconRight}</span>}
    </button>
  );
}
