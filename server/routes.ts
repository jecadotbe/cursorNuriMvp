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

export function setupRoutes(app: Router) {
  // Add file upload middleware
  app.use(
    fileUpload({
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max file size
      abortOnLimit: true,
      createParentPath: true,
    }),
  );

  // Apply rate limiting to API routes
  app.use("/api/", apiLimiter);

  // Apply stricter rate limiting to auth routes
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);

  // Default JSON content type for all API routes
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Mount route modules
  app.use("/api/auth", setupAuthRoutes(Router()));
  app.use("/api/chat", setupChatRouter(Router()));
  app.use("/api/profile", setupProfileRouter(Router()));
  app.use("/api/village", setupVillageRouter(Router()));
  app.use("/api/suggestions", setupSuggestionRouter(Router()));
  app.use("/api/onboarding", setupOnboardingRoutes(Router()));

  // Handle 404 for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  return app;
}

export function registerRoutes(app: Express): Server {
  // Initialize authentication
  setupAuth(app);

  // Create and configure the API router
  const apiRouter = Router();
  setupRoutes(apiRouter);

  // Mount the API router at /api
  app.use(apiRouter);

  // Let Vite handle all other routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
    } else {
      next();
    }
  });

  return createServer(app);
}