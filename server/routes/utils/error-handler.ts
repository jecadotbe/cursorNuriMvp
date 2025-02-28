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
  error: unknown,
  contextMessage: string = "An error occurred"
): void {
  console.error(`${contextMessage}:`, error);
  
  if (error instanceof Error) {
    const statusCode = error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      message: `${contextMessage}: ${error.message}`,
    });
  } else {
    res.status(500).json({
      message: contextMessage,
      error: typeof error === "object" ? JSON.stringify(error) : String(error),
    });
  }
}