import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

const baseField =
  "block w-full rounded-md border border-hairline-strong bg-surface px-3 text-[13.5px] text-ink placeholder:text-ink-faint " +
  "transition-[border-color,box-shadow] duration-150 ease-out " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={["block", className].join(" ")}>
      <span className="mb-1.5 flex items-center justify-between text-[12.5px] font-medium text-ink-muted">
        <span>
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </span>
        {hint && <span className="text-[12px] font-normal text-ink-faint">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[12px] text-danger">{error}</span>}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...rest }: InputProps) {
  return <input className={[baseField, "h-9", className].join(" ")} {...rest} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", children, ...rest }: SelectProps) {
  return (
    <select className={[baseField, "h-9 pr-8", className].join(" ")} {...rest}>
      {children}
    </select>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = "", ...rest }: TextareaProps) {
  return <textarea className={[baseField, "min-h-[80px] py-2", className].join(" ")} {...rest} />;
}
