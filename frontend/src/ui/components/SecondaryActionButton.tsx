import type { ButtonHTMLAttributes } from "react";

type SecondaryActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function SecondaryActionButton({ className = "", ...props }: SecondaryActionButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-xl border border-[var(--ui-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ui-text)] transition hover:bg-[var(--ui-surface-2)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
    />
  );
}
