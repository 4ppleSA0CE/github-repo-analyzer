import express from "express";
import { asyncRoute } from "../utils/asyncRoute.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { getJob } from "../queue/jobQueue.js";

export const statusRouter = express.Router();

statusRouter.get(
  "/status/:jobId",
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

    sendSuccess(res, job);
  })
);

