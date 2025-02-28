import { Response } from "express";
import { log } from "../../vite";

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
  contextMessage: string = "An error occurred"
): Response {
  // Log the error for server-side debugging
  const errorMessage = error?.message || String(error);
  log(`Error: ${contextMessage} - ${errorMessage}`, "error");
  
  // Check if we've already started sending a response
  if (res.headersSent) {
    return res;
  }

  // Determine status code based on error type or message
  let statusCode = 500;
  let userMessage = "Internal server error occurred";

  if (errorMessage.includes("not found") || errorMessage.includes("does not exist")) {
    statusCode = 404;
    userMessage = "Requested resource not found";
  } else if (
    errorMessage.includes("unauthorized") || 
    errorMessage.includes("permission") || 
    errorMessage.includes("access denied")
  ) {
    statusCode = 403;
    userMessage = "You don't have permission to perform this action";
  } else if (errorMessage.includes("invalid") || errorMessage.includes("validation")) {
    statusCode = 400;
    userMessage = "Invalid request data";
  }

  // Return appropriate error response
  return res.status(statusCode).json({
    success: false,
    message: userMessage,
    error: process.env.NODE_ENV === "production" ? undefined : errorMessage
  });
}