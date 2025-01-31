import { Router } from "express";
import { setupChatRoutes } from "./messages";
import { setupSuggestionsRoutes } from "./suggestions";
import { requireAuth } from "../../middleware/auth";

export function setupChatRouter(router: Router) {
  // Apply authentication middleware to all chat routes
  router.use(requireAuth);

  // Setup chat message routes
  const chatRouter = Router();
  setupChatRoutes(chatRouter);
  router.use('/', chatRouter);

  // Setup suggestions as a subroute
  const suggestionsRouter = Router();
  setupSuggestionsRoutes(suggestionsRouter);
  router.use('/suggestions', suggestionsRouter);

  // Add error handlers
  router.use((err: Error, req: any, res: any, next: any) => {
    if (err instanceof SyntaxError && 'body' in err) {
      console.error('JSON parsing error:', err);
      return res.status(400).json({ message: "Invalid JSON" });
    }
    next(err);
  });

  router.use((err: Error, req: any, res: any, next: any) => {
    console.error('Router error:', err);
    res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  return router;
}