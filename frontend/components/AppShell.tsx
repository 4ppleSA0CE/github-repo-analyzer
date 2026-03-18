"use client";

import Link from "next/link";
import type { ReactElement, ReactNode } from "react";

import { Container } from "./ui/Container";

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): ReactElement {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[var(--app-bg)]/90 backdrop-blur-md">
        <Container className="flex h-14 items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] shadow-sm shadow-[var(--accent)]/25">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-fg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20V10" />
                <path d="M18 20V4" />
                <path d="M6 20v-4" />
              </svg>
            </span>
            Repo Analyzer
          </Link>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--app-muted)] transition-colors hover:text-[var(--app-fg)]"
          >
            GitHub ↗
          </a>
        </Container>
      </header>

      <main className="py-14">{children}</main>

      <footer className="border-t border-[var(--app-border)]">
        <Container className="flex items-center justify-between py-6 text-xs text-[var(--app-muted)]">
          <span>© {new Date().getFullYear()} Repo Analyzer</span>
          <Link href="/" className="transition-colors hover:text-[var(--app-fg)]">
            Home
          </Link>
        </Container>
      </footer>
    </div>
  );
}
