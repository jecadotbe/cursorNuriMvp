import { Router, Request, Response } from "express";
import { handleRouteError } from "../utils/error-handler";

export function setupLogoutRoute(router: Router) {
  // Logout route
  router.post("/logout", (req: Request, res: Response) => {
    try {
      req.logout((err) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ message: "Error during logout" });
        }
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      handleRouteError(res, error, "Logout failed");
    }
  });

  return router;
}