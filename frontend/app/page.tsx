"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { FileUpload } from "../components/FileUpload";
import { UrlInput } from "../components/UrlInput";
import { startAnalysis } from "../lib/api";

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
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            GitHub Repository Analyzer
          </h1>
          <p className="text-sm text-zinc-600">
            Paste one or more GitHub repo URLs, generate a 3-section PDF report.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("paste")}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                mode === "paste" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
              }`}
            >
              Paste URLs
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                mode === "upload" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
              }`}
            >
              Upload File
            </button>
          </div>

          <div className="mt-5">
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

          <div className="mt-6 space-y-2">
            <label className="text-sm font-medium text-zinc-900">
              GitHub Token (optional, for private repos)
            </label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_…"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-400"
            />
            <p className="text-xs text-zinc-600">
              Token is only used for this analysis job and is never persisted.
            </p>
          </div>

          {error ? <div className="mt-4 text-sm text-red-700">{error}</div> : null}

          <div className="mt-6 flex items-center justify-between">
            <div className="text-xs text-zinc-600">{urls.length} repo(s) ready</div>
            <button
              type="button"
              onClick={onAnalyze}
              disabled={loading}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {loading ? "Starting…" : "Analyze"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
