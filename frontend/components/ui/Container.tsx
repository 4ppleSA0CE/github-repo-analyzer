"use client";

import type { ReactElement, ReactNode } from "react";

export interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps): ReactElement {
  return (
    <div className={["mx-auto w-full max-w-3xl px-6", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
