"use client";

import type { RepoJob } from "../types";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

export interface ReportCardProps {
  repo: RepoJob;
  onDownload: (repoId: string) => void;
}

export function ReportCard({ repo, onDownload }: ReportCardProps) {
  const title = repo.result
    ? `${repo.result.repoContext.owner}/${repo.result.repoContext.name}`
    : repo.repoUrl;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[var(--app-fg)]">{title}</span>
          {repo.status === "done" ? <Badge tone="success">Ready</Badge> : null}
          {repo.status === "error" ? <Badge tone="danger">Failed</Badge> : null}
        </div>
        {repo.status === "error" && repo.error ? (
          <div className="mt-1 text-xs text-red-600 dark:text-red-400">{repo.error}</div>
        ) : null}
      </div>
      <Button size="sm" variant="secondary" disabled={repo.status !== "done"} onClick={() => onDownload(repo.repoId)}>
        Download
      </Button>
    </div>
  );
}
