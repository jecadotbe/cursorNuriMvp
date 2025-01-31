import { Router } from "express";
import fileUpload from "express-fileupload";
import { setupAuthRoutes } from "./auth";
import { setupChatRouter } from "./chat";
import { setupProfileRouter } from "./profile";
import { setupVillageRouter } from "./village";
import { setupSuggestionRouter } from "./suggestions";
import { setupOnboardingRoutes } from "./onboarding";
import { apiLimiter, authLimiter } from "../middleware/auth";

export function setupRoutes(app: Router) {
  // Add file upload middleware
  app.use(
    fileUpload({
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max file size
      abortOnLimit: true,
      createParentPath: true,
    }),
  );

  // Apply rate limiting to all API routes
  app.use("/api/", apiLimiter);

  // Apply stricter rate limiting to auth routes
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  // Mount route modules
  app.use("/api/auth", setupAuthRoutes(Router()));
  app.use("/api/chat", setupChatRouter(Router()));
  app.use("/api/profile", setupProfileRouter(Router()));
  app.use("/api/village", setupVillageRouter(Router()));
  app.use("/api/suggestions", setupSuggestionRouter(Router()));
  app.use("/api/onboarding", setupOnboardingRoutes(Router()));

  return app;
}