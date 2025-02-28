import { Router, Request, Response } from "express";

/**
 * Setup logout route
 * @param router Express router to attach routes to
 */
export function setupLogoutRoute(router: Router) {
  router.post("/logout", (req: Request, res: Response) => {
    // Check if user is logged in
    if (!req.isAuthenticated()) {
      return res.status(400).json({ message: "You are not logged in" });
    }
    
    // Destroy the session
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Error during logout" });
      }
      
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Session destruction error:", sessionErr);
          return res.status(500).json({ message: "Error destroying session" });
        }
        
        // Clear the session cookie
        res.clearCookie("connect.sid");
        
        return res.json({ message: "Logged out successfully" });
      });
    });
  });
}