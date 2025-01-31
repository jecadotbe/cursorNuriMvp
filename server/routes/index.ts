import { Router } from "express";
import fileUpload from "express-fileupload";
import { setupAuthRoutes } from "./auth";
import { setupChatRouter } from "./chat";
import { setupProfileRouter } from "./profile";
import { villageRouter } from "./village";
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
  app.use("/api/auth", setupAuthRoutes(app));
  app.use("/api/chat", setupChatRouter(app));
  app.use("/api/profile", setupProfileRouter(app));
  app.use("/api/village", villageRouter);

  return app;
}