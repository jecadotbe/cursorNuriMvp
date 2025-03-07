// routes.ts
// This file is kept for backward compatibility
// It re-exports the modular routes from the routes directory

import { createServer, type Server } from "http";
import type { Express } from "express";
import { registerRoutes as registerModularRoutes } from "./routes/index";

/**
 * Register all application routes
 * @param app Express application instance
 * @returns HTTP server instance
 */
export function registerRoutes(app: Express): Server {
  // Create HTTP server
  const server = createServer(app);
  
  // Register modular routes
  registerModularRoutes(app);
  
  return server;
}