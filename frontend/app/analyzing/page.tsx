"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { AnalysisJob } from "../../types";
import { pollJobStatus } from "../../lib/api";
import { ProgressTable } from "../../components/ProgressTable";
import { Container } from "../../components/ui/Container";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

function isTerminal(job: AnalysisJob): boolean {
  return job.repos.every((r) => r.status === "done" || r.status === "error");
}

type StatusSummary = { done: number; analyzing: number; fetching: number; queued: number; error: number };

function statusSummary(job: AnalysisJob): StatusSummary {
  const acc: StatusSummary = { done: 0, analyzing: 0, fetching: 0, queued: 0, error: 0 };
  for (const r of job.repos) {
    if (r.status === "done") acc.done += 1;
    else if (r.status === "analyzing") acc.analyzing += 1;
    else if (r.status === "fetching") acc.fetching += 1;
    else if (r.status === "queued") acc.queued += 1;
    else acc.error += 1;
  }
  return acc;
}

export default function AnalyzingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const jobId = params.get("jobId");

  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const done = useMemo(() => (job ? isTerminal(job) : false), [job]);
  const summary = useMemo(() => (job ? statusSummary(job) : null), [job]);

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
    <Container>
      <Card>
        <CardHeader
          heading="Analyzing"
          description={done ? "Wrapping up…" : "This can take up to a minute per repository."}
          right={
            summary ? (
              <div className="flex flex-wrap items-center gap-2">
                {summary.fetching > 0 ? <Badge tone="warning">Fetching {summary.fetching}</Badge> : null}
                {summary.analyzing > 0 ? <Badge tone="info">Analyzing {summary.analyzing}</Badge> : null}
                {summary.queued > 0 ? <Badge tone="neutral">Queued {summary.queued}</Badge> : null}
                {summary.done > 0 ? <Badge tone="success">Done {summary.done}</Badge> : null}
                {summary.error > 0 ? <Badge tone="danger">Errors {summary.error}</Badge> : null}
              </div>
            ) : null
          }
        />
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
          ) : null}

          {job ? (
            <ProgressTable repos={job.repos} />
          ) : (
            <div className="space-y-3">
              <div className="h-4 w-40 rounded bg-[var(--app-surface-2)]" />
              <div className="h-24 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]" />
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

