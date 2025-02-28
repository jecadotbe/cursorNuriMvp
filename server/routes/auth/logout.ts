import { Router, Request, Response } from "express";

/**
 * Setup logout route
 * @param router Express router to attach routes to
 */
export function setupLogoutRoute(router: Router) {
  router.post("/logout", (req: Request, res: Response) => {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You are not logged in" });
    }
    
    // Perform logout
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Error during logout" });
      }
      
      // Destroy session
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction error:", err);
            return res.status(500).json({ message: "Error destroying session" });
          }
          
          // Successfully logged out
          return res.json({ message: "Successfully logged out" });
        });
      } else {
        // Session doesn't exist but user is still logged out
        return res.json({ message: "Successfully logged out" });
      }
    });
  });
}