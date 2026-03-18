"use client";

import type { RepoJob } from "../types";
import { Badge } from "./ui/Badge";

export interface ProgressTableProps {
  repos: RepoJob[];
}

function statusLabel(status: RepoJob["status"]): string {
  if (status === "queued") return "Queued";
  if (status === "fetching") return "Fetching";
  if (status === "analyzing") return "Analyzing";
  if (status === "done") return "Done";
  return "Error";
}

function statusTone(status: RepoJob["status"]): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "done") return "success";
  if (status === "error") return "danger";
  if (status === "analyzing") return "info";
  if (status === "fetching") return "warning";
  return "neutral";
}

export function ProgressTable({ repos }: ProgressTableProps) {
  return (
    <div className="divide-y divide-[var(--app-border)]">
      {repos.map((r) => (
        <div key={r.repoId} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-[var(--app-fg)]">{r.repoUrl}</div>
            {r.error ? <div className="mt-0.5 truncate text-xs text-red-600 dark:text-red-400">{r.error}</div> : null}
          </div>
          <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
        </div>
      ))}
    </div>
  );
}
