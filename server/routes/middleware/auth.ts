import { Request, Response, NextFunction } from "express";

/**
 * Middleware to ensure the user is authenticated.
 */
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
}