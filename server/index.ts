import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import "./admin"; // Import admin server
import { backgroundSuggestionGenerator } from "./services/background-suggestion-generator";
import { errorHandler } from "./lib/error-handler";
import { apiRateLimiter } from "./middleware/rate-limit";

const app = express();

// Essential middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add static file serving for public directory
app.use(express.static(path.join(process.cwd(), "public")));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Apply rate limiting to all API routes
app.use('/api', apiRateLimiter);

(async () => {
  try {
    const server = registerRoutes(app);

    // Global error handling middleware - must be after routes
    app.use(errorHandler);

    // Setup Vite or serve static files
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start background suggestion generator
    backgroundSuggestionGenerator.start();

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`serving on port ${PORT}`);
    });

    // Cleanup on exit
    process.on('SIGTERM', () => {
      console.log('Shutting down...');
      backgroundSuggestionGenerator.stop();
      server.close();
      process.exit(0);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
})();