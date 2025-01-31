import { Request, Response, NextFunction } from "express";
import { User } from "../auth";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = req.user as User;
  if (!user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
}