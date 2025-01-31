import { Request, Response, NextFunction } from "express";
import { User } from "../auth";
import rateLimit from "express-rate-limit";

// Extend Express Request type to include user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Authentication middleware
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      message: "Not authenticated",
      details: "Please log in to continue"
    });
  }
  next();
}

// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
};

// Rate limiting middleware
export const apiLimiter = rateLimit(rateLimitConfig);

// Stricter rate limit for auth endpoints
export const authLimiter = rateLimit({
  ...rateLimitConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour for auth endpoints
  message: { message: "Too many login attempts, please try again later" },
});

// Session validation middleware
export function validateSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Skip session validation for login and register routes
  if (req.path.includes('/auth/login') || req.path.includes('/auth/register')) {
    return next();
  }

  if (!req.session || !req.isAuthenticated()) {
    return res.status(401).json({ 
      message: "Not authenticated",
      details: "Please log in to continue"
    });
  }

  // Refresh session if it exists
  if (req.session) {
    req.session.touch();
  }

  next();
}