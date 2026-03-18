"use client";

import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

function cx(parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  className,
  disabled,
  children,
  ...props
}: ButtonProps): ReactElement {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-fg)/0.15] disabled:cursor-not-allowed disabled:opacity-50";

  const sizes: Record<ButtonSize, string> = {
    sm: "h-9 px-3",
    md: "h-10 px-4",
  };

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--app-fg)] text-[var(--app-bg)] hover:bg-[color:var(--app-fg)/0.92] active:bg-[color:var(--app-fg)/0.88]",
    secondary:
      "border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-fg)] hover:bg-[var(--app-surface-2)]",
    ghost: "text-[var(--app-muted)] hover:bg-[var(--app-surface-2)] hover:text-[var(--app-fg)]",
  };

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      disabled={disabled}
      className={cx([base, sizes[size], variants[variant], className])}
    >
      {leftIcon ? <span className="inline-flex shrink-0">{leftIcon}</span> : null}
      {children}
      {rightIcon ? <span className="inline-flex shrink-0">{rightIcon}</span> : null}
    </button>
  );
}

