import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { spawn } from "child_process";

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

// Start the Python Flask server for memory service
let memoryServiceAttempts = 0;
const MAX_RESTART_ATTEMPTS = 3;

function startMemoryService() {
  console.log('Starting memory service...');
  const pythonProcess = spawn('python3', ['server/memory_routes.py']);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Memory service: ${data.toString()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Memory service error: ${data.toString()}`);
  });

  pythonProcess.on('close', (code) => {
    console.error(`Memory service process exited with code ${code}`);
    if (memoryServiceAttempts < MAX_RESTART_ATTEMPTS) {
      console.log('Attempting to restart memory service...');
      memoryServiceAttempts++;
      setTimeout(startMemoryService, 1000 * memoryServiceAttempts); // Exponential backoff
    } else {
      console.error('Memory service failed to start after maximum attempts');
    }
  });

  // Reset attempts after 30 seconds of successful running
  setTimeout(() => {
    memoryServiceAttempts = 0;
  }, 30000);

  return pythonProcess;
}

(async () => {
  try {
    // Start memory service first
    const memoryService = startMemoryService();

    // Wait for memory service to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const server = registerRoutes(app);

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

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`serving on port ${PORT}`);
    });

    // Cleanup on exit
    process.on('SIGTERM', () => {
      console.log('Shutting down...');
      memoryService.kill();
      server.close();
      process.exit(0);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
})();