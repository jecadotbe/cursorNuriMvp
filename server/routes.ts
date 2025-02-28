import express, { Express, Router, Request, Response, NextFunction } from "express";
import { Server } from "http";
import { setupRoutes } from "./routes/index";
import cors from "cors";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import { IVerifyOptions } from "passport-local";
import MemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { db } from "db";
import { users } from "@db/schema";
import { eq, or } from "drizzle-orm";
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
  
  // Add direct API endpoints to match frontend expectations
  
  // Define standalone auth handlers that don't rely on router.handle() or redirects
  
  // LOGIN: Direct endpoint for authentication
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    loginRateLimiter(req, res, () => {
      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Internal server error" });
        }
        
        if (!user) {
          const ip = req.ip || req.socket.remoteAddress || "unknown";
          incrementLoginAttempts(ip);
          return res.status(401).json({ message: info?.message || "Invalid credentials" });
        }
        
        req.logIn(user, (err) => {
          if (err) {
            console.error("Session error:", err);
            return res.status(500).json({ message: "Error establishing session" });
          }
          
          const ip = req.ip || req.socket.remoteAddress || "unknown";
          clearLoginAttempts(ip);
          
          // Set session checks for suggestions if needed
          if (req.session) {
            // @ts-ignore - Adding custom property to session
            req.session.checkSuggestions = true;
          }
          
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
      })(req, res, next);
    });
  });
  
  // LOGOUT: Direct endpoint for logging out
  app.post("/api/logout", (req: Request, res: Response) => {
    // @ts-ignore - Typings for logout are incorrect
    req.logout((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      
      // Clear session cookie
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction error:", err);
          }
          
          res.clearCookie('nuri.session');
          return res.json({ message: "Logged out successfully" });
        });
      } else {
        return res.json({ message: "Logged out successfully" });
      }
    });
  });
  
  // USER INFO: Direct endpoint for getting current user
  app.get("/api/user", (req: Request, res: Response) => {
    // @ts-ignore - TypeScript doesn't recognize Passport's isAuthenticated
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as any;
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt
      }
    });
  });
  
  // REGISTER: Direct endpoint for user registration
  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get username, email, and password from request body
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: (users, { or, eq }) => 
          or(eq(users.username, username), eq(users.email, email))
      });
      
      if (existingUser) {
        return res.status(409).json({ 
          message: existingUser.username === username 
            ? "Username already taken" 
            : "Email already registered" 
        });
      }
      
      // Create password hash
      const salt = randomBytes(16).toString('hex');
      const hash = await scrypt(password, salt, 64) as Buffer;
      const passwordHash = `${salt}:${hash.toString('hex')}`;
      
      // Create user
      const result = await db.insert(users).values({
        username,
        email,
        password: passwordHash,
        createdAt: new Date()
      }).returning();
      
      const newUser = result[0];
      
      if (!newUser) {
        return res.status(500).json({ message: "Failed to create user" });
      }
      
      return res.status(201).json({ 
        message: "Registration successful",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Internal server error during registration" });
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