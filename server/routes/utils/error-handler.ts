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
  error: Error | any,
  contextMessage: string = "An error occurred while processing your request"
): Response {
  console.error("API Error:", contextMessage, error);
  
  // Ensure content-type is set and consistent
  res.setHeader('Content-Type', 'application/json');
  
  try {
    // Handle database specific errors
    if (error?.code && error.code.startsWith('P')) {
      // Prisma/Database error codes typically start with P
      return res.status(500).json({
        message: "A database error occurred",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }

    // Handle memory service errors
    if (error?.message && (error.message.toLowerCase().includes('mem0') || error.message.toLowerCase().includes('memory'))) {
      return res.status(500).json({
        message: "A memory service error occurred, but your data is still saved",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }

    // Handle authentication errors
    if (error?.message && error.message.toLowerCase().includes('auth')) {
      return res.status(401).json({
        message: "Authentication error",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }

    // Handle validation errors (custom shape used in app)
    if (error?.validation) {
      return res.status(400).json({
        message: "Validation error",
        validation: error.validation,
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }

    // Default error response
    return res.status(500).json({
      message: contextMessage,
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  } catch (jsonError) {
    // Handle error during JSON serialization - this is a critical error case
    console.error("Error in handleRouteError JSON serialization:", jsonError);
    return res.status(500).send(`{"message":"Internal server error during error handling"}`);
  }
}