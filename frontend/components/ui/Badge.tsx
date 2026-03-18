"use client";

import type { HTMLAttributes, ReactElement, ReactNode } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}

function cx(parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

export function Badge({ children, tone = "neutral", className, ...props }: BadgeProps): ReactElement {
  const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
    neutral: "border-[var(--app-border)] bg-[var(--app-surface-2)] text-[var(--app-muted)]",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-950/25 dark:text-emerald-400",
    warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/30 dark:bg-amber-950/25 dark:text-amber-400",
    danger: "border-red-200 bg-red-50 text-red-700 dark:border-red-800/30 dark:bg-red-950/25 dark:text-red-400",
    info: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/30 dark:bg-orange-950/25 dark:text-orange-400",
  };

  return (
    <span
      {...props}
      className={cx(["inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight", tones[tone], className])}
    >
      {children}
    </span>
  );
}
