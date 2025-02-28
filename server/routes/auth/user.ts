import { Router, Request, Response } from "express";

/**
 * Setup user info route 
 * @param router Express router to attach routes to
 */
export function setupUserRoute(router: Router) {
  router.get("/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Session expired" });
    }
    
    return res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        profilePicture: req.user.profilePicture,
        createdAt: req.user.createdAt
      }
    });
  });
}