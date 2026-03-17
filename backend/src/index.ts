import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";

import { config } from "./config.js";
import { analyzeRouter } from "./routes/analyze.js";
import { statusRouter } from "./routes/status.js";
import { reportRouter } from "./routes/report.js";
import { sendError, sendSuccess } from "./utils/apiResponse.js";
import { logger } from "./utils/logger.js";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: config.corsOrigin,
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(
  "/api/analyze",
  rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  })
);

app.get("/api/health", (_req, res) => {
  sendSuccess(res, { ok: true });
});

app.use("/api", analyzeRouter);
app.use("/api", statusRouter);
app.use("/api", reportRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error", {
    name: err instanceof Error ? err.name : "Unknown",
    message: err instanceof Error ? err.message : "Unknown error",
  });
  sendError(res, "INTERNAL_ERROR", "Unexpected server error", 500);
});

app.listen(config.port, () => {
  logger.info("Backend listening", { port: config.port });
});

