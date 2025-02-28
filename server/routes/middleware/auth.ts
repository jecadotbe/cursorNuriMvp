import { Request, Response, NextFunction } from "express";

/**
 * Middleware to ensure the user is authenticated.
 */
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // If not authenticated, return 401 Unauthorized response
  return res.status(401).json({ message: "Authentication required" });
}