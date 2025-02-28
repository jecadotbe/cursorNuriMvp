import { Router } from "express";
import { setupGeneralSuggestions } from "./general";
import { setupVillageSuggestions } from "./village";
import { setupFeedbackRoutes } from "./feedback";

export function setupSuggestionsRouter(router: Router) {
  const suggestionsRouter = Router();
  
  setupGeneralSuggestions(suggestionsRouter);
  setupVillageSuggestions(suggestionsRouter);
  setupFeedbackRoutes(suggestionsRouter);
  
  router.use("/suggestions", suggestionsRouter);
  
  return router;
}