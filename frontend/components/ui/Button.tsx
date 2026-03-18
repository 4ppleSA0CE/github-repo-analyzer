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
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent)]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] disabled:cursor-not-allowed disabled:opacity-35 active:scale-[0.97]";

  const sizes: Record<ButtonSize, string> = {
    sm: "h-9 px-3.5",
    md: "h-10 px-5",
  };

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)]",
    secondary:
      "border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-fg)] hover:bg-[var(--app-surface-2)]",
    ghost: "text-[var(--app-muted)] hover:text-[var(--app-fg)] hover:bg-[var(--accent-subtle)]",
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
