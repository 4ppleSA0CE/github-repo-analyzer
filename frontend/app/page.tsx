"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { FileUpload } from "../components/FileUpload";
import { UrlInput } from "../components/UrlInput";
import { startAnalysis } from "../lib/api";
import { Container } from "../components/ui/Container";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

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
      <div className="mx-auto max-w-xl stagger">
        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-[var(--app-fg)]">
            Understand any repo<br />in minutes
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-[var(--app-muted)]">
            Paste GitHub URLs. Get a clean PDF report for laypeople, business stakeholders, and engineers.
          </p>
        </div>

        {/* Main card */}
        <Card>
          <CardContent className="pt-6 space-y-5">
            {/* Paste / Upload segmented control */}
            <div className="flex items-center gap-0.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] p-1 w-fit">
              <button
                type="button"
                onClick={() => setMode("paste")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                  mode === "paste"
                    ? "bg-[var(--app-surface)] text-[var(--app-fg)] shadow-sm"
                    : "text-[var(--app-muted)] hover:text-[var(--app-fg)]"
                }`}
              >
                Paste URLs
              </button>
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                  mode === "upload"
                    ? "bg-[var(--app-surface)] text-[var(--app-fg)] shadow-sm"
                    : "text-[var(--app-muted)] hover:text-[var(--app-fg)]"
                }`}
              >
                Upload file
              </button>
            </div>

            {/* Input area */}
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

            {/* Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--app-fg)]">
                GitHub token{" "}
                <span className="font-normal text-[var(--app-muted)]">(optional)</span>
              </label>
              <Input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_…"
              />
              <p className="text-xs text-[var(--app-muted)]">
                Only needed for private repos. Never stored.
              </p>
            </div>

            {/* Error */}
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/30 dark:bg-red-950/25 dark:text-red-400">
                {error}
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-[var(--app-border)] pt-5">
              <span className="text-sm text-[var(--app-muted)]">
                {urls.length} repo{urls.length !== 1 ? "s" : ""}
              </span>
              <Button variant="primary" disabled={loading} onClick={onAnalyze}>
                {loading ? "Starting…" : "Generate reports"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
