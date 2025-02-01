import { Router } from "express";
import { db } from "@db";
import { promptSuggestions, suggestionFeedback, chats } from "@db/schema";
import { eq, desc, and, isNull, gte } from "drizzle-orm";
import { anthropic } from "../../anthropic";
import type { User } from "../../auth";

const SUGGESTION_CATEGORIES = {
  LEARNING: "learning",
  VILLAGE: "village",
  CHILD_DEVELOPMENT: "child_development",
  STRESS: "stress",
  PERSONAL_GROWTH: "personal_growth"
} as const;

export function setupSuggestionsRoutes(router: Router) {
  // Get suggestions
  router.get("/suggestions", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const now = new Date();

    try {
      const existingSuggestions = await db.query.promptSuggestions.findMany({
        where: and(
          eq(promptSuggestions.userId, user.id),
          isNull(promptSuggestions.usedAt),
          gte(promptSuggestions.expiresAt, now)
        ),
        orderBy: desc(promptSuggestions.createdAt),
        limit: 3
      });

      res.json(existingSuggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
    }
  });

  // Generate suggestions based on chat context
  router.post("/suggestions/generate", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const { chatId, lastMessageContent, messages } = req.body;

    console.log('Generating suggestions request:', {
      chatId,
      userId: user.id,
      messageCount: messages?.length
    });

    if (!lastMessageContent) {
      return res.status(400).json({ message: "Last message content is required" });
    }

    try {
      let suggestions: string[] = [];

      // Get chat context if chatId is provided
      if (chatId) {
        const chat = await db.query.chats.findFirst({
          where: eq(chats.id, chatId),
        });

        if (chat && chat.userId === user.id) {
          console.log('Found chat, generating suggestions...');

          // Format messages for context
          const contextMessages = messages?.map(msg => 
            `${msg.role}: ${msg.content}`
          ).join("\n") || lastMessageContent;

          // Generate contextual suggestions using anthropic
          const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 150,
            temperature: 0.7,
            system: "Generate 3-5 natural follow-up questions or prompts based on the current conversation context. These should be in Dutch and help continue the conversation naturally. Each suggestion should be a complete question or prompt.",
            messages: [{
              role: "user",
              content: `Based on this conversation:\n${contextMessages}\n\nGenerate natural follow-up prompts or questions that would help continue the conversation.`
            }]
          });

          console.log('Received AI response for suggestions');

          if (response.content[0].type === "text") {
            // Split response into individual suggestions
            suggestions = response.content[0].text
              .split('\n')
              .filter(s => s.trim())
              .map(s => s.replace(/^\d+\.\s*/, '').trim())
              .slice(0, 5);

            console.log('Generated suggestions:', suggestions);
          }
        } else {
          console.log('Chat not found or unauthorized');
        }
      } else {
        console.log('No chatId provided');
      }

      // If no suggestions were generated or no chatId provided, use default suggestions
      if (suggestions.length === 0) {
        console.log('Using default suggestions');
        suggestions = [
          "Kan je me daar meer over vertellen?",
          "Hoe voel je je daar precies bij?",
          "Wat zou je graag anders willen zien?",
          "Heb je hier al eerder ervaring mee gehad?",
          "Wat denk je dat een goede eerste stap zou zijn?"
        ];
      }

      res.json({ suggestions });
    } catch (error) {
      console.error("Error generating suggestions:", error);
      res.status(500).json({ message: "Failed to generate suggestions" });
    }
  });

  // Submit feedback for a suggestion
  router.post("/suggestions/:id/feedback", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const suggestionId = parseInt(req.params.id);

    if (isNaN(suggestionId)) {
      return res.status(400).json({ message: "Invalid suggestion ID" });
    }

    const { rating, feedback } = req.body;

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    try {
      // Check if suggestion exists and belongs to user
      const suggestion = await db.query.promptSuggestions.findFirst({
        where: and(
          eq(promptSuggestions.id, suggestionId),
          eq(promptSuggestions.userId, user.id),
        ),
      });

      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }

      // Save the feedback
      const [savedFeedback] = await db
        .insert(suggestionFeedback)
        .values({
          userId: user.id,
          suggestionId,
          rating,
          feedback: feedback || null,
        })
        .returning();

      res.json(savedFeedback);
    } catch (error) {
      console.error("Error saving suggestion feedback:", error);
      res.status(500).json({ message: "Failed to save feedback" });
    }
  });

  // Dismiss a suggestion
  router.post("/suggestions/:id/dismiss", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const suggestionId = parseInt(req.params.id);

    if (isNaN(suggestionId)) {
      return res.status(400).json({ message: "Invalid suggestion ID" });
    }

    try {
      await db
        .delete(promptSuggestions)
        .where(
          and(
            eq(promptSuggestions.id, suggestionId),
            eq(promptSuggestions.userId, user.id),
          ),
        );

      res.json({ message: "Suggestion dismissed" });
    } catch (error) {
      console.error("Error dismissing suggestion:", error);
      res.status(500).json({ message: "Failed to dismiss suggestion" });
    }
  });

  return router;
}