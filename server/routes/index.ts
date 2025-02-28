import { Router } from "express";
import { setupAuthRoutes } from "./auth";
import { setupChatRouter } from "./chat";
import { setupProfileRouter } from "./profile";
import { setupOnboardingRoutes } from "./onboarding";
import { setupSuggestionsRouter } from "./suggestions";
import { villageRouter } from "./village";

/**
 * Set up all API routes.
 * @param app Express router to attach routes to
 */
export function setupRoutes(app: Router) {
  // Core routes
  setupAuthRoutes(app);
  setupChatRouter(app);
  setupProfileRouter(app);
  setupOnboardingRoutes(app);
  setupSuggestionsRouter(app);
  app.use("/village", villageRouter);
}