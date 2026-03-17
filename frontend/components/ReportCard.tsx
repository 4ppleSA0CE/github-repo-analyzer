"use client";

import type { RepoJob } from "../types";

export interface ReportCardProps {
  repo: RepoJob;
  onDownload: (repoId: string) => void;
}

export function ReportCard({ repo, onDownload }: ReportCardProps) {
  const title = repo.result
    ? `${repo.result.repoContext.owner}/${repo.result.repoContext.name}`
    : repo.repoUrl;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-900">{title}</div>
          <div className="mt-1 truncate text-xs text-zinc-600">{repo.repoUrl}</div>
        </div>
        <button
          type="button"
          disabled={repo.status !== "done"}
          onClick={() => onDownload(repo.repoId)}
          className="shrink-0 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          Download PDF
        </button>
      </div>

      {repo.status === "error" ? (
        <div className="mt-3 text-xs text-red-700">{repo.error ?? "Unknown error"}</div>
      ) : null}
    </div>
  );
}

