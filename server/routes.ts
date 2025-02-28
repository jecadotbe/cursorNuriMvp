import express, { Express, Router } from "express";
import { Server } from "http";
import { setupRoutes } from "./routes/index";
import cors from "cors";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import MemoryStore from "memorystore";
import { log } from "./vite";

/**
 * Register all routes and configure Express middlewares
 * @param app Express app instance
 * @returns HTTP server instance
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Create main API router
  const apiRouter = Router();
  
  // Configure session store
  const MemoryStoreSession = MemoryStore(session);
  const sessionStore = new MemoryStoreSession({
    checkPeriod: 86400000 // Prune expired sessions every 24h
  });
  
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
  
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || "nuri-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  }));
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Register API routes
  setupRoutes(apiRouter);
  app.use("/api", apiRouter);
  
  // Add direct root-level API endpoints for compatibility
  app.use("/api/login", (req, res, next) => {
    req.url = "/login";
    apiRouter(req, res, next);
  });
  
  app.use("/api/logout", (req, res, next) => {
    req.url = "/logout";
    apiRouter(req, res, next);
  });
  
  app.use("/api/register", (req, res, next) => {
    req.url = "/register";
    apiRouter(req, res, next);
  });
  
  app.use("/api/user", (req, res, next) => {
    req.url = "/user";
    apiRouter(req, res, next);
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