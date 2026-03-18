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
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.85)_0%,rgba(255,255,255,0)_60%),linear-gradient(to_bottom,rgba(255,255,255,0.7),rgba(255,255,255,0))] dark:bg-[radial-gradient(60%_50%_at_50%_0%,rgba(24,24,27,0.8)_0%,rgba(24,24,27,0)_60%),linear-gradient(to_bottom,rgba(24,24,27,0.5),rgba(24,24,27,0))]"
      />

      <header className="sticky top-0 z-40 border-b border-[var(--app-border)] bg-[color:var(--app-surface)/0.75] backdrop-blur">
        <Container className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)]">
                <span className="h-2 w-2 rounded-full bg-[var(--app-fg)]" />
              </span>
              Repo Analyzer
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href="/"
                className="rounded-md px-2 py-1 text-sm text-[var(--app-muted)] hover:bg-[var(--app-surface-2)] hover:text-[var(--app-fg)]"
              >
                Analyze
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-md px-2 py-1 text-sm text-[var(--app-muted)] hover:bg-[var(--app-surface-2)] hover:text-[var(--app-fg)] sm:inline-flex"
            >
              GitHub
            </a>
          </div>
        </Container>
      </header>

      <main className="py-10">{children}</main>

      <footer className="border-t border-[var(--app-border)]">
        <Container className="flex flex-col gap-2 py-8 text-sm text-[var(--app-muted)] sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} Repo Analyzer</div>
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:text-[var(--app-fg)]">
              Home
            </Link>
          </div>
        </Container>
      </footer>
    </div>
  );
}

