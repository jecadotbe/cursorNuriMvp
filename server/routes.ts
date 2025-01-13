import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { villageMembers, chats } from "@db/schema";
import { eq } from "drizzle-orm";
import { anthropic, handleAnthropicError } from "./anthropic";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/village", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const members = await db.query.villageMembers.findMany({
      where: eq(villageMembers.userId, req.user.id),
    });

    res.json(members);
  });

  app.post("/api/village", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const member = await db.insert(villageMembers).values({
      ...req.body,
      userId: req.user.id,
    }).returning();

    res.json(member[0]);
  });

  app.post("/api/chat", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: req.body.messages,
      });

      // Extract the text content from the response
      const messageContent = response.content[0].text;

      const chat = await db.insert(chats).values({
        userId: req.user.id,
        messages: [...req.body.messages, { role: "assistant", content: messageContent }],
      }).returning();

      res.json(messageContent);
    } catch (error) {
      handleAnthropicError(error, res);
    }
  });

  app.get("/api/chats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, req.user.id),
    });

    res.json(userChats);
  });

  const httpServer = createServer(app);
  return httpServer;
}