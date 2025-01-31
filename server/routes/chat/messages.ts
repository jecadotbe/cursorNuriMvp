import { Router } from "express";
import { db } from "@db";
import { chats } from "@db/schema";
import { eq } from "drizzle-orm";
import { anthropic } from "../../anthropic";
import { memoryService } from "../../services/memory";
import { searchBooks } from "../../rag";
import type { User } from "../../auth";
import { getVillageContext } from "../village";

export function setupChatRoutes(router: Router) {
  // Get chat by ID
  router.get("/:chatId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const chatId = parseInt(req.params.chatId);
      if (isNaN(chatId)) {
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
    } catch (error) {
      console.error("Error fetching chat:", error);
      res.status(500).json({ 
        message: "Failed to fetch chat",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Handle chat messages
  router.post("/", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = req.user as User;

      // Get relevant memories for context
      const relevantMemories = await memoryService.getRelevantMemories(
        user.id,
        req.body.messages[req.body.messages.length - 1].content,
      );

      const villageContextString = await getVillageContext(user.id);

      const ragContext = await searchBooks(
        req.body.messages[req.body.messages.length - 1].content,
        2,
      );

      const ragContent = ragContext.map((document) => document.pageContent);
      const mergedRAG = ragContent.join("\n\n");

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 512,
        temperature: 0.4,
        system: `${process.env.NURI_SYSTEM_PROMPT}\n\nContext:\n${villageContextString}\n\n${mergedRAG}`,
        messages: req.body.messages,
      });

      const messageContent =
        response.content[0].type === "text" ? response.content[0].text : "";

      // Store conversation in memory
      try {
        // Store user's message
        await memoryService.createMemory(
          user.id,
          req.body.messages[req.body.messages.length - 1].content,
          {
            role: "user",
            messageIndex: req.body.messages.length - 1,
            chatId: req.body.chatId || "new",
            source: "nuri-chat",
            type: "conversation",
            category: "chat_history",
            timestamp: new Date().toISOString(),
          },
        );

        // Store assistant's response
        await memoryService.createMemory(user.id, messageContent, {
          role: "assistant",
          messageIndex: req.body.messages.length,
          chatId: req.body.chatId || "new",
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
        chatId: req.body.chatId
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