import express, { Express, Router, Request, Response } from "express";
import { Server } from "http";
import { setupRoutes } from "./routes/index";
import cors from "cors";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import { IVerifyOptions } from "passport-local";
import MemoryStore from "memorystore";
import { loginRateLimiter, incrementLoginAttempts, clearLoginAttempts } from "./middleware/rate-limit";
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
  
  // Add direct root-level API endpoints for frontend compatibility
  
  // Direct login endpoint
  app.post("/api/login", loginRateLimiter, (req: Request, res: Response) => {
    passport.authenticate("local", (err: any, user: any, info: IVerifyOptions) => {
      // Handle authentication errors
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      
      // If authentication failed
      if (!user) {
        // Increment failed login attempts for rate limiting
        incrementLoginAttempts(req.ip || "unknown");
        
        return res.status(401).json({ message: info.message || "Invalid credentials" });
      }
      
      // If authentication successful, log in the user
      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Error establishing session" });
        }
        
        // Clear failed attempts counter for this IP
        clearLoginAttempts(req.ip || "unknown");
        
        // Return user info without password
        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            createdAt: user.createdAt
          }
        });
      });
    })(req, res);
  });
  
  // Direct logout endpoint
  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout(() => {
      res.json({ message: "Logged out successfully" });
    });
  });
  
  // Direct user endpoint
  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Session expired" });
    }
    
    const user = req.user as any;
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
  });
  
  // Add direct register endpoint
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      // Forward to the auth router's register endpoint
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });
      
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Internal server error during registration" });
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