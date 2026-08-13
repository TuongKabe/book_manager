import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Remove the default border / background pass-through to use Card as a styled wrapper. */
  bare?: boolean;
};

function Card({ children, className = "", bare = false, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={[
        "rounded-lg bg-surface",
        bare ? "" : "border border-hairline shadow-xs",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default Card;

export function CardHeader({
  title,
  description,
  actions,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={["flex items-start justify-between gap-3 px-5 pt-5 pb-3", className].join(" ")}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
        {description && (
          <p className="mt-0.5 text-[13px] text-ink-faint">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
  scrollable = false,
  maxHeight,
}: {
  children: ReactNode;
  className?: string;
  scrollable?: boolean;
  maxHeight?: string;
}) {
  return (
    <div
      className={[
        "px-5 pb-5",
        scrollable ? "overflow-auto" : "",
        className,
      ].join(" ")}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {children}
    </div>
  );
}
