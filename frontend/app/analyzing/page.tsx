"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { AnalysisJob } from "../../types";
import { pollJobStatus } from "../../lib/api";
import { ProgressTable } from "../../components/ProgressTable";

function isTerminal(job: AnalysisJob): boolean {
  return job.repos.every((r) => r.status === "done" || r.status === "error");
}

export default function AnalyzingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const jobId = params.get("jobId");

  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const done = useMemo(() => (job ? isTerminal(job) : false), [job]);

  useEffect(() => {
    if (!jobId) {
      setError("Missing jobId.");
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    const tick = async (): Promise<void> => {
      try {
        const next = await pollJobStatus(jobId);
        if (cancelled) return;
        setJob(next);
        if (isTerminal(next)) {
          router.push(`/results?jobId=${encodeURIComponent(jobId)}`);
          return;
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to poll status");
      } finally {
        if (!cancelled) {
          timer = window.setTimeout(() => void tick(), 2000);
        }
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [jobId, router]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Analyzing…</h1>
          <p className="text-sm text-zinc-600">
            {done ? "Wrapping up…" : "This may take up to a minute per repo."}
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          {job ? <ProgressTable repos={job.repos} /> : <div className="text-sm text-zinc-600">Loading…</div>}
        </div>
      </main>
    </div>
  );
}

