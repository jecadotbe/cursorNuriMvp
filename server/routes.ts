// routes.ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { Router } from "express";
import { setupAuth } from "./auth";
import fileUpload from "express-fileupload";
import { setupRoutes } from "./routes/index";

// ==========================================
// Register Routes Function
// ==========================================
export function registerRoutes(app: Express): Server {
  // -------------------------------
  // Global Middleware
  // -------------------------------
  // File upload middleware
  app.use(
    fileUpload({
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
      abortOnLimit: true,
      createParentPath: true,
    }),
  );

  // Setup authentication and sessions
  setupAuth(app);

  // Create main API router
  const apiRouter = Router();
  
  // Setup all modular routes
  setupRoutes(apiRouter);
  
  // Mount the API router on /api prefix
  app.use("/api", apiRouter);

  // Create and return the HTTP server
  const server = createServer(app);
  return server;
}