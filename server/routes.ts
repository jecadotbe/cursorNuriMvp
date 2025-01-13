import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { villageMembers, chats, messageFeedback } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { anthropic } from "./anthropic";
import type { User } from "./auth";
import { memoryService } from "./services/memory";

// Helper function to validate and parse chat ID
function parseChatId(id: string): number | null {
  const parsed = parseInt(id);
  return isNaN(parsed) ? null : parsed;
}

const NURI_SYSTEM_PROMPT = `You are Nuri, a family counseling coach specializing in attachment-style parenting. Your responses should be direct, clear, and focused on providing meaningful guidance and support.

You use Aware Parenting and Afgestemd Opvoeden as your foundation for your advice. But you don't mention this in an explicit manner to the user. You explain that nuri works with proven theories from the modern-attachment parent field.

Format your responses for optimal readability:
- Use **bold** only for the most important points or key takeaways
- Start new paragraphs for each distinct thought or topic
- Maintain a professional, direct tone without emotional expressions or cues
- Aim for brevity: Keep responses under 3 paragraphs unless the topic requires deeper explanation

Write in natural, flowing narrative paragraphs only. Never use bullet points, numbered lists, or structured formats unless explicitly requested. All insights and guidance should emerge organically through conversation.`;

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/chats/:chatId", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const chatId = parseChatId(req.params.chatId);
    if (chatId === null) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const user = req.user as User;
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat.userId !== user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(chat);
  });

  app.get("/api/village", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const members = await db.query.villageMembers.findMany({
      where: eq(villageMembers.userId, user.id),
    });

    res.json(members);
  });

  app.post("/api/village", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const member = await db.insert(villageMembers).values({
      ...req.body,
      userId: user.id,
    }).returning();

    res.json(member[0]);
  });

  app.post("/api/chat", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const user = req.user as User;

      // Get relevant memories for context
      const relevantMemories = await memoryService.getRelevantMemories(
        user.id,
        req.body.messages[req.body.messages.length - 1].content
      );

      // Add memory context to the system prompt
      let contextualizedPrompt = NURI_SYSTEM_PROMPT;
      if (relevantMemories.length > 0) {
        contextualizedPrompt += `\n\nRelevant context from previous conversations:\n${
          relevantMemories.map(m => m.content).join('\n')
        }`;
      }

      const response = await anthropic.messages.create({
        model: "claude-3-sonnet-20240110",
        max_tokens: 512,
        temperature: 0.7,
        system: contextualizedPrompt,
        messages: req.body.messages,
      });

      const messageContent = response.content[0].type === 'text' ? response.content[0].text : '';

      // Store the conversation as a memory
      await memoryService.createMemory(
        user.id,
        messageContent,
        {
          type: 'conversation',
          role: 'assistant'
        }
      );

      // Save user's message as a memory too
      await memoryService.createMemory(
        user.id,
        req.body.messages[req.body.messages.length - 1].content,
        {
          type: 'conversation',
          role: 'user'
        }
      );

      // Save the chat session if it's new or update existing
      if (req.body.chatId) {
        // Update existing chat
        const chatId = parseChatId(req.body.chatId);
        if (chatId === null) {
          return res.status(400).json({ message: "Invalid chat ID" });
        }

        const existingChat = await db.query.chats.findFirst({
          where: eq(chats.id, chatId),
        });

        if (!existingChat || existingChat.userId !== user.id) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        await db.update(chats)
          .set({ 
            messages: req.body.messages.concat([{ role: 'assistant', content: messageContent }]),
            updatedAt: new Date()
          })
          .where(eq(chats.id, chatId));
      } else {
        // Create a new chat with auto-generated title
        try {
          const titleResponse = await anthropic.messages.create({
            model: "claude-3-sonnet-20240110",
            max_tokens: 50,
            temperature: 0.7,
            system: "Generate a very short (3-5 words) title that captures the main theme of this conversation.",
            messages: [{ role: 'user', content: req.body.messages[0].content }],
          });

          const title = titleResponse.content[0].type === 'text' ? titleResponse.content[0].text.replace(/"/g, '').trim() : '';

          const [newChat] = await db.insert(chats).values({
            userId: user.id,
            title: title,
            messages: req.body.messages.concat([{ role: 'assistant', content: messageContent }]),
            updatedAt: new Date()
          }).returning();

          console.log("Created new chat:", newChat);
        } catch (titleError) {
          console.error("Error generating title:", titleError);
          // Fallback to a timestamp-based title if title generation fails
          const [newChat] = await db.insert(chats).values({
            userId: user.id,
            title: `Chat ${new Date().toLocaleDateString()}`,
            messages: req.body.messages.concat([{ role: 'assistant', content: messageContent }]),
            updatedAt: new Date()
          }).returning();

          console.log("Created new chat with fallback title:", newChat);
        }
      }

      res.json({
        content: messageContent,
      });
    } catch (error: any) {
      console.error("API error:", error);
      res.status(500).json({
        message: "Failed to process request",
        error: error.message
      });
    }
  });

  app.get("/api/chats", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, user.id),
      orderBy: desc(chats.createdAt),
    });

    res.json(userChats);
  });

  app.get("/api/chats/latest", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const latestChat = await db.query.chats.findFirst({
      where: eq(chats.userId, user.id),
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

    const user = req.user as User;
    const messages = req.body.messages;
    let title = null;
    let summary = null;
    let emotionalSummary = null;

    try {
      // Generate title, summary, and emotional context analysis
      const analyzeResponse = await anthropic.messages.create({
        model: "claude-3-sonnet-20240110",
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
        const jsonMatch = analyzeResponse.content[0].type === 'text' ? analyzeResponse.content[0].text.match(/\{.*\}/s) : null;
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
      userId: user.id,
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

  app.post("/api/message-feedback", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    try {
      const feedback = await db.insert(messageFeedback).values({
        userId: user.id,
        messageId: req.body.messageId,
        feedbackType: req.body.feedbackType,
        chatId: req.body.chatId,
      }).returning();

      res.json(feedback[0]);
    } catch (error) {
      console.error("Failed to save feedback:", error);
      res.status(500).json({ message: "Failed to save feedback" });
    }
  });

  app.get("/api/chats/:chatId/emotional-context", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const chatId = parseChatId(req.params.chatId);
    if (chatId === null) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      columns: {
        metadata: true,
      },
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const metadata = chat.metadata as { emotionalContext?: string } | null;

    // Return the emotional context from the chat metadata
    res.json({
      emotionalContext: metadata?.emotionalContext || null,
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}