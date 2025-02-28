import { Router } from "express";
import { setupChatRoutes } from "./messages";
import { setupSuggestionsRoutes } from "./suggestions";

export function setupChatRouter(app: Router) {
  const chatRouter = Router();
  
  setupChatRoutes(chatRouter);
  setupSuggestionsRoutes(chatRouter);
  
  app.use("/chat", chatRouter);
  
  return app;
}