import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { villageInsights } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import type { User } from "./auth";

export function registerRoutes(app: Express): Server {
  // Simple GET endpoint for insights
  app.get("/api/insights", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;

    try {
      const insights = await db.query.villageInsights.findMany({
        where: eq(villageInsights.userId, user.id),
        orderBy: [desc(villageInsights.createdAt)]
      });

      res.json(insights);
    } catch (error) {
      console.error("Error fetching insights:", error);
      res.status(500).json({ 
        error: "Failed to fetch insights",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}