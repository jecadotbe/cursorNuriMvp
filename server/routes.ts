import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { villageMembers, chats, messageFeedback } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { anthropic } from "./anthropic";
import { memoryService } from "./services/memory";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Add Village Members API routes
  app.get("/api/village", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = req.user as Express.User;
      const members = await db.query.villageMembers.findMany({
        where: eq(villageMembers.userId, user.id),
      });
      res.json(members);
    } catch (error) {
      console.error("Failed to fetch village members:", error);
      res.status(500).json({ message: "Failed to fetch village members" });
    }
  });

  app.post("/api/village", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = req.user as Express.User;
      const { name, type, circle, interactionFrequency } = req.body;

      // Validate required fields
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Name is required and must be a string" });
      }

      if (!type || !['individual', 'group'].includes(type)) {
        return res.status(400).json({ message: "Type must be either 'individual' or 'group'" });
      }

      if (!circle || typeof circle !== 'number' || circle < 1 || circle > 5) {
        return res.status(400).json({ message: "Circle must be a number between 1 and 5" });
      }

      if (!interactionFrequency || typeof interactionFrequency !== 'number' || interactionFrequency < 1 || interactionFrequency > 5) {
        return res.status(400).json({ message: "Interaction frequency must be a number between 1 and 5" });
      }

      const [member] = await db
        .insert(villageMembers)
        .values({
          userId: user.id,
          name,
          type,
          circle,
          interactionFrequency,
        })
        .returning();

      res.json(member);
    } catch (error) {
      console.error("Failed to create village member:", error);
      res.status(500).json({ message: "Failed to create village member" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function parseChatId(id: string): number | null {
  const parsed = parseInt(id);
  return isNaN(parsed) ? null : parsed;
}

const NURI_SYSTEM_PROMPT = `You are Nuri, a family counseling coach specializing in attachment-style parenting. Your responses should be direct, clear, and focused on providing meaningful guidance and support.

You use Aware Parenting and Afgestemd Opvoeden as your foundation for your advice. But you don't mention this in an explicit manner to the user. You explain that nuri works with proven theories from the modern-attachment parent field.

Format your responses for optimal readability:
- Use **bold** for the most important points or key takeaways
- Start new paragraphs for each distinct thought or topic
- Maintain a professional, direct tone without emotional expressions or cues
- Aim for brevity: Keep responses under 3 paragraphs unless the topic requires deeper explanation

Write in natural, flowing narrative paragraphs only. Never use bullet points, numbered lists, or structured formats unless explicitly requested. All insights and guidance should emerge organically through conversation.`;