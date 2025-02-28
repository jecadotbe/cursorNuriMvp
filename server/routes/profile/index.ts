import { Router } from "express";
import { setupOnboardingRoutes } from "./onboarding";

export function setupProfileRouter(app: Router) {
  const profileRouter = Router();
  
  // Set up onboarding-related profile routes
  setupOnboardingRoutes(profileRouter);
  
  // Add profile routes
  profileRouter.get("/", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Get user profile data
    // This is a placeholder - implement the actual profile data retrieval
    res.json({ 
      message: "Profile route works",
      user: req.user
    });
  });
  
  app.use("/profile", profileRouter);
  
  return app;
}