import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { villageMembers, chats } from "@db/schema";
import { eq, desc } from "drizzle-orm";
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
      // First, analyze the emotion in the user's message
      const emotionResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Analyze the emotional content of this message and respond with a JSON object containing 'primaryEmotion' and 'emotionalContext'. Keep it simple and focus on basic emotions (joy, sadness, anger, fear, neutral, etc.):\n\n${req.body.messages[req.body.messages.length - 1].content}`,
          },
        ],
      });

      const emotionalAnalysis = JSON.parse(emotionResponse.content[0].text);

      // Now generate the assistant's response with awareness of the emotional context
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: `You are NURI, an empathetic AI assistant. The user's message carries a ${emotionalAnalysis.primaryEmotion} emotional tone. Respond with understanding and emotional intelligence.`,
        messages: req.body.messages,
      });

      // Extract the text content from the response
      const messageContent = response.content[0].text;

      res.json({
        content: messageContent,
        emotionalContext: emotionalAnalysis,
      });
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
      orderBy: desc(chats.createdAt),
    });

    res.json(userChats);
  });

  app.get("/api/chats/latest", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const latestChat = await db.query.chats.findFirst({
      where: eq(chats.userId, req.user.id),
      orderBy: desc(chats.createdAt),
    });

    if (!latestChat) {
      return res.json(null);
    }

    res.json(latestChat);
  });

  app.post("/api/chats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const messages = req.body.messages;
    let title = null;
    let summary = null;
    let emotionalSummary = null;

    try {
      // Generate title, summary, and emotional context analysis
      const analyzeResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Based on this conversation, provide a JSON response with:
1. A short title (max 5 words)
2. A brief summary (max 2 sentences)
3. An emotional journey summary (describe how emotions evolved in the conversation)
All in Dutch:\n\n${JSON.stringify(messages)}`,
          },
        ],
      });

      const analysis = JSON.parse(analyzeResponse.content[0].text);
      title = analysis.title;
      summary = analysis.summary;
      emotionalSummary = analysis.emotionalJourney;
    } catch (error) {
      console.error("Failed to generate analysis:", error);
    }

    const chat = await db.insert(chats).values({
      userId: req.user.id,
      messages: req.body.messages,
      title,
      summary,
      metadata: {
        messageCount: messages.length,
        lastMessageRole: messages[messages.length - 1].role,
        emotionalContext: emotionalSummary,
      },
      updatedAt: new Date(),
    }).returning();

    res.json(chat[0]);
  });

  const httpServer = createServer(app);
  return httpServer;
}