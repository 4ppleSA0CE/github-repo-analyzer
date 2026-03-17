"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { AnalysisJob, RepoJob } from "../../types";
import { downloadCombinedReport, downloadReport, pollJobStatus } from "../../lib/api";
import { ReportCard } from "../../components/ReportCard";

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
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Results</h1>
            <p className="text-sm text-zinc-600">
              {job ? `${doneRepos.length} report(s) ready` : "Loading…"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
            >
              New analysis
            </button>
            <button
              type="button"
              disabled={!jobId || doneRepos.length === 0 || downloading}
              onClick={onDownloadCombined}
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              Download all (PDF)
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {hasErrors ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Some repositories failed. Successful repos are still downloadable below.
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4">
          {(job?.repos ?? []).map((repo: RepoJob) => (
            <ReportCard key={repo.repoId} repo={repo} onDownload={onDownloadRepo} />
          ))}
        </div>
      </main>
    </div>
  );
}

