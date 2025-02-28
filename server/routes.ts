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
  
  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).send({ status: "ok" });
  });
  
  // Create HTTP server but don't start listening yet
  const { createServer } = await import('node:http');
  const server = createServer(app);
  
  return server;
}