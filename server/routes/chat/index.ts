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

  // Add session check middleware
  router.use((req, res, next) => {
    if (req.session && !req.session.cookie.expires) {
      console.log("Refreshing session");
      req.session.touch();
    }
    next();
  });

  // Setup chat routes directly on the router
  setupChatRoutes(router);

  // Setup suggestions as a subroute
  const suggestionsRouter = Router();
  setupSuggestionsRoutes(suggestionsRouter);
  router.use('/suggestions', suggestionsRouter);

  // Handle JSON parsing errors
  router.use((err: Error, req: any, res: any, next: any) => {
    if (err instanceof SyntaxError && 'body' in err) {
      console.error('JSON parsing error:', err);
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

  // Mount the main router under /api/chats to match client expectations
  app.use('/api/chats', router);

  return router;
}