import express from "express";
import { asyncRoute } from "../utils/asyncRoute.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { config } from "../config.js";
import { createJob, markJobRunning, processJob } from "../queue/jobQueue.js";

export const analyzeRouter = express.Router();

interface AnalyzeBody {
  repoUrls?: unknown;
  githubToken?: unknown;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

analyzeRouter.post(
  "/analyze",
  asyncRoute(async (req, res) => {
    const body: AnalyzeBody = req.body as AnalyzeBody;
    if (!isStringArray(body.repoUrls) || body.repoUrls.length === 0) {
      sendError(res, "INVALID_INPUT", "repoUrls must be a non-empty string[]", 400);
      return;
    }
    if (body.repoUrls.length > config.maxBatchSize) {
      sendError(
        res,
        "BATCH_TOO_LARGE",
        `Batch size exceeds MAX_BATCH_SIZE (${config.maxBatchSize})`,
        400
      );
      return;
    }

    const githubToken = typeof body.githubToken === "string" ? body.githubToken : undefined;
    let jobId: string;
    try {
      jobId = await createJob(body.repoUrls, githubToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create job";
      if (message === "MAX_CONCURRENT_JOBS_REACHED") {
        sendError(
          res,
          "MAX_CONCURRENT_JOBS_REACHED",
          "Too many jobs running, please try again shortly",
          429
        );
        return;
      }
      sendError(res, "JOB_CREATE_FAILED", message, 500);
      return;
    }
    markJobRunning(jobId);
    void processJob(jobId);
    sendSuccess(res, { jobId }, 201);
  })
);

