import { Request, Response, NextFunction } from "express";

/**
 * Middleware to ensure the user is authenticated.
 */
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Authentication required" });
}