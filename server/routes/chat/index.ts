import { Router } from "express";
import { setupChatRoutes } from "./messages";
import { setupSuggestionsRoutes } from "./suggestions";

export function setupChatRouter(app: Router) {
  const router = Router();

  // Ensure JSON content type for all routes
  router.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  setupChatRoutes(router);
  setupSuggestionsRoutes(router);

  return router;
}