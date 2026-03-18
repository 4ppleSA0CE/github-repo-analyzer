"use client";

import type { HTMLAttributes, ReactElement, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function cx(parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  heading: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
}

export function Card({ className, children, ...props }: CardProps): ReactElement {
  return (
    <div
      {...props}
      className={cx(["rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm", className])}
    >
      {children}
    </div>
  );
}

export function CardHeader({ heading, description, right, className, ...props }: CardHeaderProps): ReactElement {
  return (
    <div {...props} className={cx(["flex items-start justify-between gap-4 p-5", className])}>
      <div className="min-w-0">
        <div className="text-sm font-semibold tracking-tight text-[var(--app-fg)]">{heading}</div>
        {description ? <div className="mt-1 text-sm text-[var(--app-muted)]">{description}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardContent({ className, children, ...props }: CardContentProps): ReactElement {
  return (
    <div {...props} className={cx(["px-5 pb-5", className])}>
      {children}
    </div>
  );
}

