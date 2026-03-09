import type { ButtonHTMLAttributes } from "react";

type PrimaryActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function PrimaryActionButton({ className = "", ...props }: PrimaryActionButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-xl bg-[var(--ui-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
    />
  );
}
