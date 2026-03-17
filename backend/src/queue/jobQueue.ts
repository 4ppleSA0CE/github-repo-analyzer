import crypto from "crypto";
import { config } from "../config.js";
import type { AnalysisJob, RepoJob } from "../types/index.js";
import { fetchRepoContext } from "../services/github.js";
import { runBusinessAgent, runEngineerAgent, runLaymanAgent } from "../services/gemini.js";
import { generateRepoPdf, combinePdfs } from "../services/pdfGenerator.js";
import { logger } from "../utils/logger.js";

const JOB_TTL_MS = 60 * 60 * 1000;
const jobs = new Map<string, AnalysisJob>();
const runningJobs = new Set<string>();
const jobTokens = new Map<string, string | undefined>();
const repoPdfs = new Map<string, Buffer>();
const combinedPdfs = new Map<string, Buffer>();

function cleanupExpiredJobs(nowMs: number): void {
  for (const [jobId, job] of jobs.entries()) {
    const createdAt = Date.parse(job.createdAt);
    if (!Number.isFinite(createdAt)) continue;
    if (nowMs - createdAt > JOB_TTL_MS) {
      jobs.delete(jobId);
      runningJobs.delete(jobId);
      jobTokens.delete(jobId);
      combinedPdfs.delete(jobId);
      for (const repo of job.repos) repoPdfs.delete(repo.repoId);
    }
  }
}

export async function createJob(repoUrls: string[], githubToken?: string): Promise<string> {
  cleanupExpiredJobs(Date.now());
  if (runningJobs.size >= config.maxConcurrentJobs) {
    throw new Error("MAX_CONCURRENT_JOBS_REACHED");
  }

  const jobId = crypto.randomUUID();
  const repos: RepoJob[] = repoUrls.map((repoUrl) => ({
    repoId: `${jobId}:${repoUrl}`,
    repoUrl,
    status: "queued",
  }));

  jobs.set(jobId, {
    jobId,
    repos,
    createdAt: new Date().toISOString(),
  });
  jobTokens.set(jobId, githubToken);

  return jobId;
}

export function getJob(jobId: string): AnalysisJob | undefined {
  cleanupExpiredJobs(Date.now());
  return jobs.get(jobId);
}

function updateRepo(jobId: string, repoId: string, patch: Partial<RepoJob>): void {
  const job = jobs.get(jobId);
  if (!job) return;
  const updatedRepos = job.repos.map((r) => (r.repoId === repoId ? { ...r, ...patch } : r));
  jobs.set(jobId, { ...job, repos: updatedRepos });
}

function setCompleted(jobId: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  if (job.completedAt) return;
  jobs.set(jobId, { ...job, completedAt: new Date().toISOString() });
  runningJobs.delete(jobId);
}

export async function processJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  const token = jobTokens.get(jobId);

  try {
    const pdfsToCombine: Buffer[] = [];

    for (const repo of job.repos) {
      updateRepo(jobId, repo.repoId, { status: "fetching" });
      try {
        const repoContext = await fetchRepoContext(repo.repoUrl, token);

        updateRepo(jobId, repo.repoId, { status: "analyzing" });

        const [laymanSummary, businessSummary, engineerSummary] = await Promise.all([
          runLaymanAgent(repoContext),
          runBusinessAgent(repoContext),
          runEngineerAgent(repoContext),
        ]);

        const result = {
          repoUrl: repo.repoUrl,
          repoContext,
          laymanSummary,
          businessSummary,
          engineerSummary,
          generatedAt: new Date().toISOString(),
        };

        const pdf = await generateRepoPdf(result);
        repoPdfs.set(repo.repoId, pdf);
        pdfsToCombine.push(pdf);

        updateRepo(jobId, repo.repoId, { status: "done", result });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        updateRepo(jobId, repo.repoId, { status: "error", error: message });
      }
    }

    if (pdfsToCombine.length > 0) {
      try {
        const combined = await combinePdfs(pdfsToCombine);
        combinedPdfs.set(jobId, combined);
      } catch (err) {
        logger.warn("Failed to combine PDFs", {
          jobId,
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  } finally {
    setCompleted(jobId);
  }
}

export function markJobRunning(jobId: string): void {
  runningJobs.add(jobId);
}

export function markJobFinished(jobId: string): void {
  runningJobs.delete(jobId);
  const job = jobs.get(jobId);
  if (job && !job.completedAt) {
    jobs.set(jobId, { ...job, completedAt: new Date().toISOString() });
  }
}

export function setJob(job: AnalysisJob): void {
  jobs.set(job.jobId, job);
}

export function getRepoPdf(repoId: string): Buffer | undefined {
  return repoPdfs.get(repoId);
}

export function getCombinedPdf(jobId: string): Buffer | undefined {
  return combinedPdfs.get(jobId);
}

