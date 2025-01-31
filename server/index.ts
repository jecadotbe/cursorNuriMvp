import express, { type Request, Response, NextFunction } from "express";
import { setupRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();

// Trust proxy - required for rate limiting behind proxy
app.set('trust proxy', 1);

// Essential middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

(async () => {
  try {
    // Initialize server with routes
    const server = setupRoutes(app);

    // Setup Vite in development mode
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    }

    // Global error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      if (process.env.NODE_ENV === "development") {
        res.status(status).json({
          message,
          stack: err.stack,
          details: err.details || undefined
        });
      } else {
        // Serve static files only in production
        app.use(express.static(path.join(process.cwd(), "public")));
        serveStatic(app);
        res.status(status).json({ message });
      }
    });

    const port = parseInt(process.env.PORT || "3000", 10);
    server.listen(port, "0.0.0.0", () => {
      log(`Server running on port ${port}`);
    }).on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        const nextPort = port + 1;
        log(`Port ${port} is busy, trying ${nextPort}...`);
        server.listen(nextPort, "0.0.0.0");
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