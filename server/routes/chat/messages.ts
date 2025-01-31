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
    console.log("GET /api/chats called");
    if (!req.isAuthenticated()) {
      console.log("User not authenticated");
      return res.status(401).json({ 
        message: "Not authenticated",
        details: "Please log in to access chat history"
      });
    }

    try {
      const user = req.user as User;
      console.log(`Fetching chats for user ${user.id}`);

      const userChats = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: desc(chats.updatedAt),
      });

      console.log(`Found ${userChats.length} chats for user ${user.id}`);
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
    console.log("POST /api/chats called");
    if (!req.isAuthenticated()) {
      console.log("User not authenticated");
      return res.status(401).json({ 
        message: "Not authenticated",
        details: "Please log in to create a new chat"
      });
    }

    try {
      const user = req.user as User;
      const { title = `Chat ${new Date().toLocaleDateString()}` } = req.body;

      console.log(`Creating new chat for user ${user.id}`);
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

      console.log(`Created new chat with ID: ${newChat.id}`);
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
    console.log(`GET /api/chats/${req.params.chatId} called`);
    if (!req.isAuthenticated()) {
      console.log("User not authenticated");
      return res.status(401).json({ 
        message: "Not authenticated",
        details: "Please log in to view chat details"
      });
    }

    try {
      const chatId = parseInt(req.params.chatId);
      if (isNaN(chatId)) {
        return res.status(400).json({ message: "Invalid chat ID" });
      }

      const user = req.user as User;
      console.log(`Fetching chat ${chatId} for user ${user.id}`);

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

  // Handle chat messages
  router.post("/messages", async (req, res) => {
    console.log("POST /api/chats/messages called");
    if (!req.isAuthenticated()) {
      console.log("User not authenticated");
      return res.status(401).json({ 
        message: "Not authenticated",
        details: "Please log in to send messages"
      });
    }

    try {
      const user = req.user as User;
      const { chatId, messages } = req.body;

      console.log(`Processing messages for chat ${chatId}`);

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "Invalid messages format" });
      }

      // Get relevant memories for context
      console.log("Fetching relevant memories");
      const relevantMemories = await memoryService.getRelevantMemories(
        user.id,
        messages[messages.length - 1].content,
      );

      console.log("Getting village context");
      const villageContextString = await getVillageContext(user.id);

      console.log("Searching books for context");
      const ragContext = await searchBooks(
        messages[messages.length - 1].content,
        2,
      );

      const ragContent = ragContext.map((document) => document.pageContent);
      const mergedRAG = ragContent.join("\n\n");

      console.log("Calling Anthropic API");
      const response = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 512,
        temperature: 0.4,
        system: `${process.env.NURI_SYSTEM_PROMPT}\n\nContext:\n${villageContextString}\n\n${mergedRAG}`,
        messages,
      });

      const messageContent =
        response.content[0].type === "text" ? response.content[0].text : "";

      // Update chat with new messages
      if (chatId) {
        console.log(`Updating chat ${chatId} with new message`);
        await db.update(chats)
          .set({ 
            messages: [...messages, { role: "assistant", content: messageContent }],
            updatedAt: new Date()
          })
          .where(eq(chats.id, chatId));
      }

      // Store conversation in memory
      try {
        console.log("Storing conversation in memory");
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