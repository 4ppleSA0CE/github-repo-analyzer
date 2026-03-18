"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { AnalysisJob, RepoJob } from "../../types";
import { downloadCombinedReport, downloadReport, pollJobStatus } from "../../lib/api";
import { ReportCard } from "../../components/ReportCard";
import { Container } from "../../components/ui/Container";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function isDone(job: AnalysisJob): boolean {
  return job.repos.every((r) => r.status === "done" || r.status === "error");
}

export default function ResultsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const jobId = params.get("jobId");

  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const doneRepos = useMemo(() => job?.repos.filter((r) => r.status === "done") ?? [], [job]);
  const errorCount = useMemo(() => (job?.repos ?? []).filter((r) => r.status === "error").length, [job]);

  useEffect(() => {
    if (!jobId) {
      setError("Missing jobId.");
      return;
    }
    void (async () => {
      try {
        const next = await pollJobStatus(jobId);
        setJob(next);
        if (!isDone(next)) {
          router.push(`/analyzing?jobId=${encodeURIComponent(jobId)}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load results");
      }
    })();
  }, [jobId, router]);

  const onDownloadRepo = async (repoId: string): Promise<void> => {
    setDownloading(true);
    setError(null);
    try {
      const blob = await downloadReport(repoId);
      downloadBlob(blob, "report.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to download report");
    } finally {
      setDownloading(false);
    }
  };

  const onDownloadCombined = async (): Promise<void> => {
    if (!jobId) return;
    setDownloading(true);
    setError(null);
    try {
      const blob = await downloadCombinedReport(jobId);
      downloadBlob(blob, "combined-report.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to download combined report");
    } finally {
      setDownloading(false);
    }
  };

  const hasErrors = (job?.repos ?? []).some((r) => r.status === "error");

  return (
    <Container>
      <Card>
        <CardHeader
          heading="Results"
          description={job ? `${doneRepos.length} report(s) ready` : "Loading…"}
          right={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => router.push("/")}>
                New analysis
              </Button>
              <Button disabled={!jobId || doneRepos.length === 0 || downloading} onClick={onDownloadCombined}>
                Download all
              </Button>
            </div>
          }
        />
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">Ready {doneRepos.length}</Badge>
            {hasErrors ? <Badge tone="danger">Failed {errorCount}</Badge> : null}
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
          ) : null}

          {hasErrors ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Some repositories failed. Successful repos are still downloadable below.
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4">
            {(job?.repos ?? []).map((repo: RepoJob) => (
              <ReportCard key={repo.repoId} repo={repo} onDownload={onDownloadRepo} />
            ))}
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}

