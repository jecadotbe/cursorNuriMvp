import { Request, Response, NextFunction } from "express";

interface AppError extends Error {
  status?: number;
  code?: string;
}

// Global error handling middleware
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(`[Error] ${err.stack}`);

  // Handle specific error types
  switch (err.code) {
    case "23505": // PostgreSQL unique violation
      return res.status(409).json({
        message: "Resource already exists",
        error: err.message,
      });
    case "23503": // PostgreSQL foreign key violation
      return res.status(400).json({
        message: "Invalid reference",
        error: err.message,
      });
    default:
      return res.status(err.status || 500).json({
        message: err.message || "Internal server error",
        error: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
  }
}

// Not found handler
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    message: `Cannot ${req.method} ${req.url}`,
  });
}

// Request validation error handler
export function validationErrorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.message,
    });
  }
  next(err);
}
