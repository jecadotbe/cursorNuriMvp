import { Router } from "express";
import { setupChatRoutes } from "./messages";
import { setupSuggestionsRoutes } from "./suggestions";

export function setupChatRouter(app: Router) {
  const router = Router();

  // Ensure JSON responses for all routes
  router.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Handle JSON parsing errors
  router.use((err: Error, req: any, res: any, next: any) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ message: "Invalid JSON" });
    }
    next(err);
  });

  // Generic error handler
  router.use((err: Error, req: any, res: any, next: any) => {
    console.error('Router error:', err);
    res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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

  // Mount the main router under /api/chats
  app.use('/api/chats', router);

  return router;
}