import express, { Express, Router, Request, Response, NextFunction } from "express";
import { Server } from "http";
import { setupRoutes } from "./routes/index";
import cors from "cors";
import bodyParser from "body-parser";
import { setupAuth } from "./auth";
import { log } from "./vite";

/**
 * Register all routes and configure Express middlewares
 * @param app Express app instance
 * @returns HTTP server instance
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Create main API router
  const apiRouter = Router();
  
  // Configure middlewares
  app.use(cors({
    origin: (origin, callback) => {
      // In development, allow any origin to simplify testing
      callback(null, true);
    },
    credentials: true,
  }));
  
  app.use(bodyParser.json({ limit: "5mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));
  
  // Setup authentication - this includes session setup and passport initialization
  setupAuth(app);
  
  // Register API routes
  setupRoutes(apiRouter);
  app.use("/api", apiRouter);
  
  // Add test endpoint for mem0 (no authentication required)
  app.get("/mem0-test", async (_req: Request, res: Response) => {
    try {
      const { mem0Service } = await import('./services/mem0');
      
      console.log("Testing mem0 integration...");
      
      // Get service status
      const serviceStatus = mem0Service.getStatus();
      
      if (!serviceStatus.ready) {
        return res.status(500).json({ 
          error: "Mem0 service not ready: " + (serviceStatus.error || "Unknown error"),
          success: false
        });
      }
      
      // Try to create a test memory entry for test user ID 999
      console.log("Testing mem0 service by creating a test memory...");
      
      const testContent = "This is a test memory entry created at " + new Date().toISOString();
      
      const storeResult = await mem0Service.storeMemory(999, testContent, {
        source: 'test-endpoint',
        type: 'test',
        category: 'test',
        role: 'system'
      });
      
      console.log("Test memory creation result:", storeResult);
      
      // Also test creating a user
      const userResult = await mem0Service.createUser(999, "test-user", "test@example.com");
      console.log("Test user creation result:", userResult);
      
      // Test storing an onboarding step
      const stepResult = await mem0Service.storeOnboardingStep(999, 0, {
        basicInfo: {
          name: "Test User",
          parentType: "mom",
          experienceLevel: "first_time"
        }
      });
      console.log("Test onboarding step result:", stepResult);
      
      res.json({ 
        service_status: serviceStatus,
        memory_test: storeResult,
        user_test: userResult,
        onboarding_test: stepResult,
        success: true
      });
    } catch (error) {
      console.error("Mem0 test error:", error);
      res.status(500).json({ 
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined,
        success: false 
      });
    }
  });
  
  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).send({ status: "ok" });
  });
  
  // Create HTTP server but don't start listening yet
  const { createServer } = await import('node:http');
  const server = createServer(app);
  
  return server;
}