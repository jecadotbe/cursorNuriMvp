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

  // Mount subroutes
  const chatRouter = Router();
  const suggestionsRouter = Router();

  // Setup each route module
  setupChatRoutes(chatRouter);
  setupSuggestionsRoutes(suggestionsRouter);

  // Mount the subrouters
  router.use('/', chatRouter);
  router.use('/suggestions', suggestionsRouter);

  app.use('/api/chats', router);

  return router;
}