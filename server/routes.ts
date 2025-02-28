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
  
  // Add test endpoint for mem0
  app.get("/api/test-mem0", async (req: Request, res: Response) => {
    try {
      const { MemoryClient } = await import('mem0ai');
      const { memoryService } = await import('./services/memory');
      
      console.log("Testing mem0 integration directly...");
      
      // Test if the API key is available
      if (!process.env.MEM0_API_KEY) {
        return res.status(500).json({ 
          error: "MEM0_API_KEY not available",
          success: false
        });
      }
      
      console.log("Creating direct mem0 client for testing");
      const directClient = new MemoryClient({ 
        apiKey: process.env.MEM0_API_KEY 
      });
      
      console.log("Testing client connection...");
      
      // Try to create a test memory entry
      const testMessages = [{
        role: "system",
        content: "This is a test memory entry created at " + new Date().toISOString()
      }];
      
      // Try to add a memory for user_id 999 (test user)
      const result = await directClient.add(testMessages, {
        user_id: "999",
        metadata: {
          source: 'test',
          type: 'test',
          category: 'test',
          timestamp: new Date().toISOString()
        }
      });
      
      console.log("Direct mem0 test result:", result);
      
      // Also test using our memory service
      const serviceResult = await memoryService.createMemory(999, "Test memory from service", {
        source: 'test-service',
        type: 'test',
        category: 'test'
      });
      
      console.log("Memory service test result:", serviceResult);
      
      res.json({ 
        directResult: result,
        serviceResult,
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
  
  // Register API routes
  setupRoutes(apiRouter);
  app.use("/api", apiRouter);
  
  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).send({ status: "ok" });
  });
  
  // Create HTTP server but don't start listening yet
  const { createServer } = await import('node:http');
  const server = createServer(app);
  
  return server;
}