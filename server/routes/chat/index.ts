import { Router } from "express";
import { setupChatRoutes } from "./messages";
import { setupSuggestionsRoutes } from "./suggestions";

export function setupChatRouter(app: Router) {
  const router = Router();
  
  setupChatRoutes(router);
  setupSuggestionsRoutes(router);
  
  return router;
}
