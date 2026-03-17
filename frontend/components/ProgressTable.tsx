"use client";

import type { RepoJob } from "../types";

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

function statusClass(status: RepoJob["status"]): string {
  if (status === "done") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "error") return "bg-red-50 text-red-700 border-red-200";
  if (status === "analyzing") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "fetching") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-zinc-50 text-zinc-700 border-zinc-200";
}

export function ProgressTable({ repos }: ProgressTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs text-zinc-600">
          <tr>
            <th className="px-4 py-3 font-medium">Repository</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Error</th>
          </tr>
        </thead>
        <tbody>
          {repos.map((r) => (
            <tr key={r.repoId} className="border-t border-zinc-100">
              <td className="px-4 py-3 font-medium text-zinc-900">{r.repoUrl}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(
                    r.status
                  )}`}
                >
                  {statusLabel(r.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-zinc-600">{r.error ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

