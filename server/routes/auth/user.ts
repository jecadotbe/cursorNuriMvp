import { Router, Request, Response } from "express";
import { ensureAuthenticated } from "../middleware/auth";
import { handleRouteError } from "../utils/error-handler";

export function setupUserRoute(router: Router) {
  // Get current user
  router.get("/user", (req: Request, res: Response) => {
    try {
      if (req.isAuthenticated() && req.user) {
        // Return user info without password
        const user = req.user as any;
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      }
      
      res.status(401).json({ message: "Session expired" });
    } catch (error) {
      handleRouteError(res, error, "Error retrieving user");
    }
  });

  return router;
}