import express from "express";
import { asyncRoute } from "../utils/asyncRoute.js";
import { sendError } from "../utils/apiResponse.js";
import { getCombinedPdf, getRepoPdf, getJob } from "../queue/jobQueue.js";

export const reportRouter = express.Router();

reportRouter.get(
  "/report/:repoId",
  asyncRoute(async (req, res) => {
    const repoId = req.params.repoId;
    if (!repoId) {
      sendError(res, "INVALID_REPO_ID", "Missing repoId", 400);
      return;
    }

    const pdf = getRepoPdf(repoId);
    if (!pdf) {
      sendError(res, "REPORT_NOT_READY", "Report not available", 404);
      return;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="report.pdf"`);
    res.status(200).send(pdf);
  })
);

reportRouter.get(
  "/report/combined/:jobId",
  asyncRoute(async (req, res) => {
    const { jobId } = req.params;
    if (!jobId) {
      sendError(res, "INVALID_JOB_ID", "Missing jobId", 400);
      return;
    }

    const job = getJob(jobId);
    if (!job) {
      sendError(res, "JOB_NOT_FOUND", "Job not found", 404);
      return;
    }

    const combined = getCombinedPdf(jobId);
    if (!combined) {
      sendError(res, "REPORT_NOT_READY", "Combined report not available", 404);
      return;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="combined-report.pdf"`);
    res.status(200).send(combined);
  })
);

