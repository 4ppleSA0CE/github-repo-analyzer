"use client";

import type { ReactElement, TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

function cx(parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

export function Textarea({ className, error, ...props }: TextareaProps): ReactElement {
  return (
    <div className="space-y-1">
      <textarea
        {...props}
        className={cx([
          "min-h-[140px] w-full resize-y rounded-lg border bg-[var(--app-surface)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none transition-all duration-150 placeholder:text-[var(--app-muted)]/50 focus:border-[var(--accent)]/40 focus:ring-2 focus:ring-[var(--accent)]/8",
          error ? "border-red-300 focus:border-red-400 focus:ring-red-200/20" : "border-[var(--app-border)]",
          className,
        ])}
      />
      {error ? <div className="text-xs text-red-600 dark:text-red-400">{error}</div> : null}
    </div>
  );
}
