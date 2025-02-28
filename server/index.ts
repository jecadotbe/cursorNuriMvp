import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { setupAdminServer } from "./admin"; // Import admin server setup function

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

(async () => {
  try {
    // Set up routes (async)
    const server = await registerRoutes(app);
    
    // Set up admin server if needed
    const adminServer = setupAdminServer();

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
    });

    // Setup Vite or serve static files
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Use the PORT environment variable for Replit compatibility
    // Default to 5000 which is expected by Replit workflows
    const PORT = parseInt(process.env.PORT || '5000', 10);
    
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on port ${PORT}`);
    }).on('error', (e: any) => {
      console.error('Server startup error:', e);
      
      // If port is in use and we're not already using a fallback port
      if (e.code === 'EADDRINUSE' && PORT === 5000) {
        const FALLBACK_PORT = 3000;
        console.log(`Port ${PORT} is in use, trying fallback port ${FALLBACK_PORT}`);
        
        server.listen(FALLBACK_PORT, "0.0.0.0", () => {
          log(`Server running on fallback port ${FALLBACK_PORT}`);
        }).on('error', (fallbackError: any) => {
          console.error('Fallback port also failed:', fallbackError);
          process.exit(1);
        });
      } else {
        process.exit(1);
      }
    });

    // Cleanup on exit - simplified because memoryService is removed
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