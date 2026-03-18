"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { FileUpload } from "../components/FileUpload";
import { UrlInput } from "../components/UrlInput";
import { startAnalysis } from "../lib/api";
import { Container } from "../components/ui/Container";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";

type InputMode = "paste" | "upload";

function extractUrls(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>("paste");
  const [urlsText, setUrlsText] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const urls = useMemo(() => extractUrls(urlsText), [urlsText]);

  const onAnalyze = async (): Promise<void> => {
    setError(null);
    if (urls.length === 0) {
      setError("Please provide at least one GitHub repository URL.");
      return;
    }
    setLoading(true);
    try {
      const { jobId } = await startAnalysis(urls, githubToken.trim() || undefined);
      router.push(`/analyzing?jobId=${encodeURIComponent(jobId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start analysis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-5">
          <div className="inline-flex items-center gap-2">
            <Badge tone="neutral">PDF reports</Badge>
            <Badge tone="neutral">Audience-specific</Badge>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--app-fg)]">
            Understand a repo in minutes.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--app-muted)]">
            Paste GitHub URLs and generate a clean, downloadable report with three sections for laypeople, business
            stakeholders, and engineers.
          </p>
          <div className="mt-6 flex flex-col gap-3 text-sm text-[var(--app-muted)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)]">
                ✓
              </span>
              Token stays in-browser and is only used for this job.
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)]">
                ✓
              </span>
              Works for public repos; supports private repos with a token.
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)]">
                ✓
              </span>
              One combined PDF for batches.
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <Card>
            <CardHeader
              heading="Analyze repositories"
              description="Paste URLs or upload a file. We’ll generate PDFs you can share."
              right={
                <div className="flex items-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] p-1">
                  <Button
                    variant={mode === "paste" ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setMode("paste")}
                    className={mode === "paste" ? "h-8 px-3" : "h-8 px-3"}
                  >
                    Paste
                  </Button>
                  <Button
                    variant={mode === "upload" ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setMode("upload")}
                    className={mode === "upload" ? "h-8 px-3" : "h-8 px-3"}
                  >
                    Upload
                  </Button>
                </div>
              }
            />
            <CardContent className="space-y-6">
              <div>
                {mode === "paste" ? (
                  <UrlInput value={urlsText} onChange={setUrlsText} />
                ) : (
                  <FileUpload
                    onUrls={(incoming) => {
                      setUrlsText(incoming.join("\n"));
                      setMode("paste");
                    }}
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--app-fg)]">GitHub token (optional)</label>
                <Input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_…"
                />
                <p className="text-xs text-[var(--app-muted)]">
                  Use this only for private repositories. We don’t store it.
                </p>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
              ) : null}

              <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                <div className="text-sm text-[var(--app-muted)]">{urls.length} repo(s) ready</div>
                <Button variant="primary" disabled={loading} onClick={onAnalyze}>
                  {loading ? "Starting…" : "Generate reports"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="shadow-none">
              <CardContent className="pt-5">
                <div className="text-sm font-semibold text-[var(--app-fg)]">Three audiences</div>
                <div className="mt-1 text-sm text-[var(--app-muted)]">
                  Layman, business, and engineer sections in one report.
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="pt-5">
                <div className="text-sm font-semibold text-[var(--app-fg)]">Downloadable PDF</div>
                <div className="mt-1 text-sm text-[var(--app-muted)]">
                  Clean formatting, shareable output, consistent structure.
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="pt-5">
                <div className="text-sm font-semibold text-[var(--app-fg)]">Batch-friendly</div>
                <div className="mt-1 text-sm text-[var(--app-muted)]">
                  Run multiple repos and download a combined report.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Container>
  );
}
