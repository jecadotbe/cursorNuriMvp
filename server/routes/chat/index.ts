import { Router } from "express";
import { setupChatRoutes } from "./messages";
import { setupSuggestionsRoutes } from "./suggestions";
import { setupVillageChatIntegration } from "./village-integration";
import { setupVillageRecommendationsRoutes } from "./village-recommendations";

export function setupChatRouter(app: Router) {
  const router = Router();

  // Register chat message routes
  setupChatRoutes(router);

  // Register suggestion routes - add proper base path
  const suggestionRouter = Router();
  setupSuggestionsRoutes(suggestionRouter);
  router.use('/suggestions', suggestionRouter);

  // Register village integration routes
  setupVillageChatIntegration(router);
  
  // Register village recommendations routes
  setupVillageRecommendationsRoutes(router);

  return router;
}