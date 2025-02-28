import { Router, Request, Response } from "express";

/**
 * Setup logout route
 * @param router Express router to attach routes to
 */
export function setupLogoutRoute(router: Router) {
  router.post("/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Session destruction error:", sessionErr);
          return res.status(500).json({ message: "Logout error" });
        }
        
        res.clearCookie("connect.sid");
        return res.json({ message: "Logged out successfully" });
      });
    });
  });
}