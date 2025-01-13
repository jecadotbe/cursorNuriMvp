import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { villageMembers, chats } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { anthropic } from "./anthropic";

// Helper function to handle Anthropic API errors
function handleAnthropicError(error: any, res: any) {
  console.error("Anthropic API error:", error);
  res.status(500).json({
    message: "Failed to process request",
    error: error.message
  });
}

const NURI_SYSTEM_PROMPT = `You are Nuri, a family counseling coach specializing in conscious parenting. Maintain a warm, empathetic presence while focusing on providing meaningful guidance and support. 

You use Aware Parenting and Afgestemd Opvoeden as your foundation for your advice. But you don't mention this in an explicit manner to the user. You explain that nuri works with proven theories from the modern-attachment parent field

Write in natural, flowing narrative paragraphs only. Never use bullet points, numbered lists, or structured formats unless explicitly requested. All insights and guidance should emerge organically through conversation.

Emotional signaling should be minimal and used sparingly - only include a simple italic signal (e.g. *listens*) when it genuinely enhances understanding of the response. Avoid physical descriptions or forced behavioral cues.

Support families in developing stronger relationships through conscious approaches to common challenges. Focus on authentic communication while maintaining appropriate boundaries.`;

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/village", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const members = await db.query.villageMembers.findMany({
      where: eq(villageMembers.userId, req.user.id),
    });

    res.json(members);
  });

  app.post("/api/village", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const member = await db.insert(villageMembers).values({
      ...req.body,
      userId: req.user.id,
    }).returning();

    res.json(member[0]);
  });

  app.post("/api/chat", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      // First, analyze the emotion in the user's message
      const emotionResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: `${NURI_SYSTEM_PROMPT}\n\nAnalyze the emotional content of the message and respond with a JSON object that captures the primary emotion and context. Focus on understanding parental emotions and family dynamics.`,
        messages: [
          {
            role: "user",
            content: `Given this message, provide emotional analysis in this exact JSON format: {"primaryEmotion": "joy|sadness|anger|fear|neutral", "emotionalContext": "brief explanation focusing on parenting context"}\n\nMessage: ${req.body.messages[req.body.messages.length - 1].content}`,
          },
        ],
      });

      let emotionalAnalysis;
      try {
        // Extract just the JSON part from the response
        const jsonMatch = emotionResponse.content[0].text.match(/\{.*\}/s);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        emotionalAnalysis = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error("Error parsing emotional analysis:", parseError);
        emotionalAnalysis = {
          primaryEmotion: "neutral",
          emotionalContext: "Unable to determine emotional context",
        };
      }

      // Now generate the assistant's response with awareness of the emotional context
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: `${NURI_SYSTEM_PROMPT}\n\nThe user's message carries a ${emotionalAnalysis.primaryEmotion} emotional tone. Context: ${emotionalAnalysis.emotionalContext}. Remember to maintain a warm, empathetic presence while providing meaningful guidance.`,
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
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, req.user.id),
      orderBy: desc(chats.createdAt),
    });

    res.json(userChats);
  });

  app.get("/api/chats/latest", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
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
    if (!req.isAuthenticated() || !req.user) {
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
        system: `${NURI_SYSTEM_PROMPT}\n\nAnalyze this conversation between a parent and Nuri. Focus on the key themes, emotional journey, and parenting insights discussed.`,
        messages: [
          {
            role: "user",
            content: `Based on this conversation, provide a JSON response in this exact format:
{
  "title": "short title capturing main parenting theme (max 5 words)",
  "summary": "brief summary focusing on parenting insights (max 2 sentences)",
  "emotionalJourney": "describe how parent's emotions evolved through the conversation"
}

Conversation: ${JSON.stringify(messages)}`,
          },
        ],
      });

      try {
        const jsonMatch = analyzeResponse.content[0].text.match(/\{.*\}/s);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          title = analysis.title;
          summary = analysis.summary;
          emotionalSummary = analysis.emotionalJourney;
        }
      } catch (parseError) {
        console.error("Failed to parse analysis:", parseError);
      }
    } catch (error) {
      console.error("Failed to generate analysis:", error);
    }

    const chat = await db.insert(chats).values({
      userId: req.user.id,
      messages: messages,
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