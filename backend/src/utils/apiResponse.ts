import type { Response } from "express";
import type { ApiError, ApiSuccess } from "../types/index.js";

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data } satisfies ApiSuccess<T>);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  status = 400
): void {
  res
    .status(status)
    .json({ success: false, error: { code, message } } satisfies ApiError);
}

