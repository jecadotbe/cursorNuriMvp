import { Router } from "express";
import { setupChatRoutes } from "./messages";
import { setupSuggestionsRoutes } from "./suggestions";
import { setupVillageChatIntegration } from "./village-integration";

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

  return router;
}