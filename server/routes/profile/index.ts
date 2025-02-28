import { Router } from "express";
import { setupParentProfileRoutes } from "./parent";
import { setupChildProfileRoutes } from "./children";
import { setupOnboardingRoutes } from "./onboarding";

export function setupProfileRouter(app: Router) {
  const router = Router();
  
  setupParentProfileRoutes(router);
  setupChildProfileRoutes(router);
  setupOnboardingRoutes(router);
  
  return router;
}
