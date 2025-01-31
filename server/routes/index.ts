import { Router } from "express";
import fileUpload from "express-fileupload";
import { setupAuthRoutes } from "./auth";
import { setupChatRouter } from "./chat";
import { setupProfileRouter } from "./profile";
import { setupVillageRouter } from "./village";
import { setupSuggestionRouter } from "./suggestions";
import { apiLimiter, authLimiter } from "../middleware/auth";

export function setupRoutes(app: Router) {
  // Apply rate limiting to all API routes
  app.use("/api/", apiLimiter);

  // Apply stricter rate limiting to auth routes
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  // Add file upload middleware
  app.use(
    fileUpload({
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max file size
      abortOnLimit: true,
      createParentPath: true,
    }),
  );

  // Initialize sub-routers
  const chatRouter = Router();
  const authRouter = Router();
  const profileRouter = Router();
  const villageRouter = Router();
  const suggestionRouter = Router();

  // Set up route handlers
  setupChatRouter(chatRouter);
  setupAuthRoutes(authRouter);
  setupProfileRouter(profileRouter);
  setupVillageRouter(villageRouter);
  setupSuggestionRouter(suggestionRouter);

  // Mount routes
  app.use("/api/auth", authRouter);
  app.use("/api/chats", chatRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/village", villageRouter);
  app.use("/api/suggestions", suggestionRouter);

  return app;
}