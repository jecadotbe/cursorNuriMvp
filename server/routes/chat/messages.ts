import { Router, Response } from "express";
import { db } from "@db";
import { chats, messageFeedback } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { anthropic } from "../../anthropic";
import { memoryService } from "../../services/memory";
import { handleRouteError } from "../utils/error-handler";
import { parseChatId } from "../utils/param-parser";
import { ensureAuthenticated } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";
import { getPatternForUser, getStructureForUser, PATTERN_PROMPTS, STRUCTURE_PROMPTS } from "../../lib/response-patterns";

export function setupChatRoutes(router: Router) {
  // Get list of chats
  router.get("/", ensureAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const allChats = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: [desc(chats.updatedAt)],
      });

      res.json(allChats);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch chats");
    }
  });

  // Create new chat
  router.post("/", ensureAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const title = req.body.title || "New Chat";
      const [newChat] = await db
        .insert(chats)
        .values({
          userId: user.id,
          title,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      res.status(201).json(newChat);
    } catch (error) {
      handleRouteError(res, error, "Failed to create chat");
    }
  });

  // Get a specific chat by ID
  router.get("/:id", ensureAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const chatId = parseChatId(req.params.id);
      if (!chatId) return res.status(400).json({ message: "Invalid chat ID" });

      const chat = await db.query.chats.findFirst({
        where: and(eq(chats.id, chatId), eq(chats.userId, user.id)),
      });

      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // Get chat messages from messages table
      // This should be implemented based on your schema
      const messages = []; // Placeholder for actual chat messages

      res.json({ ...chat, messages });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch chat");
    }
  });

  // Send message to chat
  router.post("/:id/messages", ensureAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const chatId = parseChatId(req.params.id);
      if (!chatId) return res.status(400).json({ message: "Invalid chat ID" });

      const { content } = req.body;
      if (!content) return res.status(400).json({ message: "Message content is required" });

      // Check if chat exists and belongs to user
      const chat = await db.query.chats.findFirst({
        where: and(eq(chats.id, chatId), eq(chats.userId, user.id)),
      });

      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // Get relevant memories for context
      const memories = await memoryService.getRelevantMemories(user.id, content);
      const memoryContext = memories.length > 0
        ? "Relevant user context:\n" + memories.map(m => m.content).join("\n\n")
        : "";

      // Get user's communication preferences from parent profile
      const parentProfile = await db.query.parentProfiles.findFirst({
        where: eq(db.schema.parentProfiles.userId, user.id),
      });

      const communicationPreference = parentProfile?.communicationPreference || "empathetic";
      const pattern = getPatternForUser(communicationPreference);
      const structure = getStructureForUser(communicationPreference);

      // Build system prompt with preferred patterns and structure
      const systemPrompt = `
You are Nuri, a supportive and empathetic parenting coach that helps parents navigate the challenges of parenting.

${PATTERN_PROMPTS[pattern]}

${STRUCTURE_PROMPTS[structure]}

Keep responses conversational, supportive, and tailored to the parent's needs.
Provide practical, actionable advice using concrete examples when possible.
`;

      // Call Anthropic API
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `${memoryContext}\n\nUser message: ${content}`,
          },
        ],
      });

      // Store memory of this interaction
      try {
        await memoryService.createMemory(user.id, `User asked: ${content}\nNuri responded: ${response.content[0].text}`, {
          type: "chat_interaction",
          chatId: chatId.toString(),
        });
      } catch (memoryError) {
        console.error("Failed to store chat memory:", memoryError);
      }

      // Update chat's updatedAt and title if it's the first message
      await db
        .update(chats)
        .set({
          updatedAt: new Date(),
          title: chat.title === "New Chat" ? content.substring(0, 30) + "..." : chat.title,
        })
        .where(eq(chats.id, chatId));

      // Return the response
      res.json({
        role: "assistant",
        content: response.content[0].text,
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to process message");
    }
  });

  // Submit feedback for a message
  router.post("/:chatId/messages/:messageId/feedback", ensureAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const chatId = parseChatId(req.params.chatId);
      if (!chatId) return res.status(400).json({ message: "Invalid chat ID" });

      const messageId = req.params.messageId;
      const { feedback, comment } = req.body;

      if (!feedback || !["positive", "negative"].includes(feedback)) {
        return res.status(400).json({ message: "Invalid feedback value" });
      }

      // Store feedback
      await db.insert(messageFeedback).values({
        userId: user.id,
        chatId,
        messageId,
        feedback,
        comment: comment || null,
        createdAt: new Date(),
      });

      res.json({ message: "Feedback submitted successfully" });
    } catch (error) {
      handleRouteError(res, error, "Failed to submit feedback");
    }
  });

  // Delete a chat
  router.delete("/:id", ensureAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const chatId = parseChatId(req.params.id);
      if (!chatId) return res.status(400).json({ message: "Invalid chat ID" });

      // Check if chat exists and belongs to user
      const chat = await db.query.chats.findFirst({
        where: and(eq(chats.id, chatId), eq(chats.userId, user.id)),
      });

      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // Delete chat
      await db.delete(chats).where(eq(chats.id, chatId));

      res.json({ message: "Chat deleted successfully" });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete chat");
    }
  });

  return router;
}