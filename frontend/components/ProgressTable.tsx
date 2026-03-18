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
    <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--app-surface-2)] text-xs text-[var(--app-muted)]">
          <tr>
            <th className="px-4 py-3 font-medium">Repository</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Error</th>
          </tr>
        </thead>
        <tbody>
          {repos.map((r) => (
            <tr key={r.repoId} className="border-t border-[color:var(--app-border)/0.6]">
              <td className="px-4 py-3 font-medium text-[var(--app-fg)]">{r.repoUrl}</td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
              </td>
              <td className="px-4 py-3 text-xs text-[var(--app-muted)]">{r.error ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

