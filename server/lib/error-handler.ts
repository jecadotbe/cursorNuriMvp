import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// Base application error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Indicates if this is an expected error
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  errors?: Record<string, string[]>;
  
  constructor(message = 'Validation failed', errors?: Record<string, string[]>) {
    super(message, 400);
    this.errors = errors;
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  retryAfter?: number;
  
  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429);
    this.retryAfter = retryAfter;
  }
}

// Format ZodError into a more user-friendly structure
const formatZodError = (error: ZodError) => {
  const formattedErrors: Record<string, string[]> = {};
  
  error.errors.forEach(err => {
    const path = err.path.join('.');
    if (!formattedErrors[path]) {
      formattedErrors[path] = [];
    }
    formattedErrors[path].push(err.message);
  });
  
  return formattedErrors;
};

// Global error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  console.error(`[ERROR] ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });
  
  // Handle ZodError (validation errors)
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: formatZodError(err)
    });
  }
  
  // Handle AppError (our custom errors)
  if (err instanceof AppError) {
    const response: any = {
      status: 'error',
      message: err.message
    };
    
    // Add additional error details if available
    if (err instanceof ValidationError && err.errors) {
      response.errors = err.errors;
    }
    
    if (err instanceof RateLimitError && err.retryAfter) {
      response.retryAfter = err.retryAfter;
      res.set('Retry-After', String(err.retryAfter));
    }
    
    return res.status(err.statusCode).json(response);
  }
  
  // Handle unknown errors
  // In production, don't expose error details
  const isProduction = process.env.NODE_ENV === 'production';
  
  return res.status(500).json({
    status: 'error',
    message: isProduction ? 'Internal server error' : err.message,
    stack: isProduction ? undefined : err.stack
  });
};

// Async handler to catch errors in async route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 