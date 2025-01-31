import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();

// Trust proxy - required for rate limiting behind proxy
app.set('trust proxy', 1);

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

  // Capture JSON responses for logging
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

// Handle CORS and Content-Type for API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

(async () => {
  try {
    const server = registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Send error response with more details in development
      if (app.get("env") === "development") {
        res.status(status).json({
          message,
          stack: err.stack,
          details: err.details || undefined
        });
      } else {
        res.status(status).json({ message });
      }
    });

    // Setup Vite or serve static files
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on port ${PORT}`);
    })
    .on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        log(`Port ${PORT} is busy, trying ${PORT + 1}...`);
        server.listen(PORT + 1, "0.0.0.0");
      } else {
        console.error('Server error:', error);
      }
    });

    // Cleanup on exit
    process.on('SIGTERM', () => {
      console.log('Shutting down...');
      server.close();
      process.exit(0);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
})();