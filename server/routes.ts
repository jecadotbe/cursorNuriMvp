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
  
  // Add a test endpoint for mem0 that doesn't require auth
  app.get("/api/test-mem0-public", async (req: Request, res: Response) => {
    try {
      const mem0 = await import('mem0ai');
      const MemoryClient = mem0.default;
      const { memoryService } = await import('./services/memory');
      
      console.log("Testing mem0 integration...");
      
      // Test if the API key is available
      if (!process.env.MEM0_API_KEY) {
        return res.status(500).json({ 
          error: "MEM0_API_KEY not available",
          success: false
        });
      }
      
      // Create a direct client
      const client = new MemoryClient({ 
        apiKey: process.env.MEM0_API_KEY 
      });
      
      // Test direct memory creation
      const testMsg = [{
        role: "system",
        content: "Test memory at " + new Date().toISOString()
      }];
      
      const result = await client.add(testMsg, {
        user_id: "test_user_999",
        metadata: {
          source: 'test',
          type: 'test'
        }
      });
      
      // Test via our service
      const serviceResult = await memoryService.createMemory(999, 
        "Test memory via service " + new Date().toISOString(), 
        { source: 'test-service' }
      );
      
      res.json({ 
        directResult: result,
        serviceResult,
        success: true,
        apiKey: process.env.MEM0_API_KEY ? "Present" : "Missing" 
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
  
  // Setup authentication - this includes session setup and passport initialization
  setupAuth(app);
  
  // Register API routes
  setupRoutes(apiRouter);
  app.use("/api", apiRouter);
  
  // Health check endpoint
  app.get("/health", (req: Request, res: Response) => {
    res.status(200).send({ status: "ok" });
  });
  
  // Create HTTP server but don't start listening yet
  const { createServer } = await import('node:http');
  const server = createServer(app);
  
  return server;
}