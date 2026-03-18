"use client";

import type { RepoJob } from "../types";
import { Button } from "./ui/Button";
import { Card, CardContent } from "./ui/Card";
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
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-sm font-semibold text-[var(--app-fg)]">{title}</div>
              {repo.status === "done" ? <Badge tone="success">Ready</Badge> : null}
              {repo.status === "error" ? <Badge tone="danger">Failed</Badge> : null}
            </div>
            <div className="mt-1 truncate text-xs text-[var(--app-muted)]">{repo.repoUrl}</div>
          </div>
          <Button size="sm" disabled={repo.status !== "done"} onClick={() => onDownload(repo.repoId)}>
            Download PDF
          </Button>
        </div>

        {repo.status === "error" ? (
          <div className="mt-3 text-sm text-red-800">{repo.error ?? "Unknown error"}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

