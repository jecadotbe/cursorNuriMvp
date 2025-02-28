import { Router } from "express";
import { setupAuthRoutes } from "./auth";
import { setupSuggestionsRouter } from "./suggestions";
import { setupOnboardingRoutes } from "./onboarding";
import { setupProfileRouter } from "./profile";
import { setupVillageRouter } from "./village";
import { setupChatRouter } from "./chat";

/**
 * Set up all API routes.
 * @param app Express router to attach routes to
 */
export function setupRoutes(app: Router) {
  // Set up auth routes
  setupAuthRoutes(app);
  
  // Set up suggestion routes
  setupSuggestionsRouter(app);
  
  // Set up onboarding routes
  setupOnboardingRoutes(app);
  
  // Set up profile routes
  setupProfileRouter(app);
  
  // Set up village routes
  setupVillageRouter(app);
  
  // Set up chat routes
  setupChatRouter(app);
  
  return app;
}