import type { Express } from "express";
import { createServer, type Server } from "http";
import fileUpload from "express-fileupload";
import { Router } from "express";
import { setupAuth } from "./auth";
import { setupAuthRoutes } from "./routes/auth";
import { setupChatRouter } from "./routes/chat";
import { setupProfileRouter } from "./routes/profile";
import { setupVillageRouter } from "./routes/village";
import { setupSuggestionRouter } from "./routes/suggestions";
import { setupOnboardingRoutes } from "./routes/onboarding";
import { apiLimiter, authLimiter } from "./middleware/auth";

export const SUGGESTION_CATEGORIES = {
  LEARNING: "learning",
  VILLAGE: "village",
  CHILD_DEVELOPMENT: "child_development",
  STRESS: "stress",
  PERSONAL_GROWTH: "personal_growth"
} as const;

export type ChildProfile = {
  name: string;
  age: number;
  specialNeeds: string[];
};

export function setupRoutes(app: Express): Server {
  // Initialize authentication
  setupAuth(app);

  // Create API router
  const apiRouter = Router();

  // Set JSON content type for all API routes
  apiRouter.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // File upload middleware for API routes
  apiRouter.use(fileUpload({
    limits: { fileSize: 2 * 1024 * 1024 },
    abortOnLimit: true,
    createParentPath: true,
  }));

  // Apply rate limiting to API routes
  apiRouter.use(apiLimiter);

  // Apply stricter rate limiting to auth endpoints
  apiRouter.use("/auth/login", authLimiter);
  apiRouter.use("/auth/register", authLimiter);

  // Mount route modules
  apiRouter.use("/auth", setupAuthRoutes(Router()));
  apiRouter.use("/chat", setupChatRouter(Router()));
  apiRouter.use("/profile", setupProfileRouter(Router()));
  apiRouter.use("/village", setupVillageRouter(Router()));
  apiRouter.use("/suggestions", setupSuggestionRouter(Router()));
  apiRouter.use("/onboarding", setupOnboardingRoutes(Router()));

  // Handle 404 for API routes
  apiRouter.use((req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Mount API router at /api
  app.use('/api', apiRouter);

  // Let Vite handle all other routes in development
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) {
      next();
    }
  });

  return createServer(app);
}