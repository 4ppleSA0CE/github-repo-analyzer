import type { AnalysisJob, ApiResponse } from "../types";

const apiBaseUrl =
  process.env["NEXT_PUBLIC_API_URL"]?.replace(/\/+$/, "") ?? "http://localhost:3001";

async function parseApiResponse<T>(resp: Response): Promise<T> {
  const json: unknown = await resp.json();
  const data = json as ApiResponse<T>;
  if (!data || typeof data !== "object") {
    throw new Error("Invalid API response");
  }
  if ("success" in data && data.success === true) {
    return data.data;
  }
  if ("success" in data && data.success === false) {
    throw new Error(data.error.message);
  }
  throw new Error("Invalid API response");
}

export async function startAnalysis(
  repoUrls: string[],
  githubToken?: string
): Promise<{ jobId: string }> {
  const resp = await fetch(`${apiBaseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrls, githubToken }),
  });
  return await parseApiResponse<{ jobId: string }>(resp);
}

export async function pollJobStatus(jobId: string): Promise<AnalysisJob> {
  const resp = await fetch(`${apiBaseUrl}/api/status/${encodeURIComponent(jobId)}`, {
    cache: "no-store",
  });
  return await parseApiResponse<AnalysisJob>(resp);
}

export async function downloadReport(repoId: string): Promise<Blob> {
  const resp = await fetch(`${apiBaseUrl}/api/report/${encodeURIComponent(repoId)}`, {
    method: "GET",
  });
  if (!resp.ok) throw new Error("Failed to download report");
  return await resp.blob();
}

export async function downloadCombinedReport(jobId: string): Promise<Blob> {
  const resp = await fetch(
    `${apiBaseUrl}/api/report/combined/${encodeURIComponent(jobId)}`,
    { method: "GET" }
  );
  if (!resp.ok) throw new Error("Failed to download combined report");
  return await resp.blob();
}

