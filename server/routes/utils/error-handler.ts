import { Response } from "express";

/**
 * Centralized error handler for routes.
 * 
 * @param res Express response object
 * @param error Error that occurred
 * @param contextMessage Optional context message for the error
 */
export function handleRouteError(
  res: Response,
  error: any,
  contextMessage = "An error occurred",
) {
  console.error(`${contextMessage}:`, error);
  res.status(500).json({
    message: contextMessage,
    error: error instanceof Error ? error.message : "Unknown error",
  });
}