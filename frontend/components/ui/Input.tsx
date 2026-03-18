"use client";

import type { InputHTMLAttributes, ReactElement } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

function cx(parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

export function Input({ className, error, ...props }: InputProps): ReactElement {
  return (
    <div className="space-y-1">
      <input
        {...props}
        className={cx([
          "h-10 w-full rounded-lg border bg-[var(--app-surface)] px-3 text-sm text-[var(--app-fg)] shadow-sm outline-none transition-colors placeholder:text-[color:var(--app-muted)/0.9] focus:border-[color:var(--app-fg)/0.25] focus:ring-2 focus:ring-[color:var(--app-fg)/0.08]",
          error ? "border-red-300 focus:border-red-300 focus:ring-red-200/40" : "border-[var(--app-border)]",
          className,
        ])}
      />
      {error ? <div className="text-xs text-red-700">{error}</div> : null}
    </div>
  );
}

