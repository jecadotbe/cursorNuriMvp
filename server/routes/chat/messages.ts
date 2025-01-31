import { Router } from "express";
import { db } from "@db";
import { chats } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { anthropic } from "../../anthropic";
import { memoryService } from "../../services/memory";
import { searchBooks } from "../../rag";
import type { User } from "../../auth";
import { getVillageContext } from "../village";

export function setupChatRoutes(router: Router) {
  // List all chats
  router.get("/", async (req, res) => {
    try {
      const user = req.user as User;
      if (!user?.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userChats = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: [desc(chats.updatedAt)],
      });

      res.json(userChats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ 
        message: "Failed to fetch chats",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create a new chat
  router.post("/", async (req, res) => {
    try {
      const user = req.user as User;
      if (!user?.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { title = `Chat ${new Date().toLocaleDateString()}` } = req.body;

      const [newChat] = await db
        .insert(chats)
        .values({
          userId: user.id,
          title,
          messages: [],
          metadata: {},
          contentEmbedding: '[]'
        })
        .returning();

      if (!newChat?.id) {
        throw new Error("Failed to create chat");
      }

      res.json(newChat);
    } catch (error) {
      console.error("Error creating chat:", error);
      res.status(500).json({ 
        message: "Failed to create chat",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get chat by ID
  router.get("/:chatId", async (req, res) => {
    try {
      const chatId = parseInt(req.params.chatId);
      if (isNaN(chatId)) {
        return res.status(400).json({ message: "Invalid chat ID" });
      }

      const user = req.user as User;
      if (!user?.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const chat = await db.query.chats.findFirst({
        where: eq(chats.id, chatId),
      });

      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      if (chat.userId !== user.id) {
        return res.status(403).json({ message: "Unauthorized to access this chat" });
      }

      res.json(chat);
    } catch (error) {
      console.error("Error fetching chat:", error);
      res.status(500).json({
        message: "Failed to fetch chat",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Handle messages
  router.post("/messages", async (req, res) => {
    try {
      const user = req.user as User;
      if (!user?.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { chatId, messages } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "Invalid messages format" });
      }

      // Verify chat ownership if chatId is provided
      if (chatId) {
        const chat = await db.query.chats.findFirst({
          where: eq(chats.id, chatId),
        });

        if (!chat) {
          return res.status(404).json({ message: "Chat not found" });
        }

        if (chat.userId !== user.id) {
          return res.status(403).json({ message: "Unauthorized to access this chat" });
        }
      }

      const relevantMemories = await memoryService.getRelevantMemories(
        user.id,
        messages[messages.length - 1].content,
      );

      const villageContextString = await getVillageContext(user.id);

      const ragContext = await searchBooks(
        messages[messages.length - 1].content,
        2,
      );

      const ragContent = ragContext.map((document) => document.pageContent);
      const mergedRAG = ragContent.join("\n\n");

      const response = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 512,
        temperature: 0.4,
        system: `${process.env.NURI_SYSTEM_PROMPT}\n\nContext:\n${villageContextString}\n\n${mergedRAG}`,
        messages,
      });

      const messageContent = response.content[0].type === "text" ? response.content[0].text : "";

      // Update chat with new messages
      if (chatId) {
        const updateResult = await db.update(chats)
          .set({ 
            messages: [...messages, { role: "assistant", content: messageContent }],
            updatedAt: new Date()
          })
          .where(eq(chats.id, chatId))
          .returning();

        if (!updateResult?.[0]) {
          throw new Error("Failed to update chat");
        }
      }

      // Store conversation in memory
      try {
        await memoryService.createMemory(user.id, messages[messages.length - 1].content, {
          role: "user",
          messageIndex: messages.length - 1,
          chatId: chatId || "new",
          source: "nuri-chat",
          type: "conversation",
          category: "chat_history",
          timestamp: new Date().toISOString(),
        });

        await memoryService.createMemory(user.id, messageContent, {
          role: "assistant",
          messageIndex: messages.length,
          chatId: chatId || "new",
          source: "nuri-chat",
          type: "conversation",
          category: "chat_history",
          timestamp: new Date().toISOString(),
        });
      } catch (memoryError) {
        console.error("Failed to store chat in memory:", memoryError);
      }

      res.json({ 
        role: "assistant",
        content: messageContent,
        chatId
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({
        message: "Failed to process chat message",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}