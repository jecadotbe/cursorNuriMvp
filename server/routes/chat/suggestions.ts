import { Router, Response } from "express";
import { db } from "@db";
import { promptSuggestions } from "@db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { anthropic } from "../../anthropic";
import { handleRouteError } from "../utils/error-handler";
import { ensureAuthenticated } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";

export function setupSuggestionsRoutes(router: Router) {
  // Get chat suggestions based on context
  router.post("/suggestions", ensureAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const { context } = req.body;
      if (!context) return res.status(400).json({ message: "Context is required" });

      // Get user's recent suggestions first
      const existingSuggestions = await db.query.promptSuggestions.findMany({
        where: and(
          eq(promptSuggestions.userId, user.id),
          isNull(promptSuggestions.usedAt),
          isNull(promptSuggestions.dismissedAt)
        ),
        limit: 5,
      });

      // If we have enough suggestions, return them
      if (existingSuggestions.length >= 3) {
        return res.json(existingSuggestions);
      }

      // Otherwise, generate new context-specific suggestions
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        temperature: 0.7,
        system: `You are a helpful AI assistant for a parenting app. 
Generate 3 follow-up question suggestions based on the context of the current conversation.
Each suggestion should be 60-100 characters and should be phrased as a question or prompt.
The suggestions should be relevant to parenting, child development, or the user's specific situation.
Make the suggestions diverse and cover different aspects of the topic at hand.`,
        messages: [
          {
            role: "user",
            content: `Here's the context of my conversation: ${context}

Based on this, suggest 3 follow-up questions or topics I might want to ask about next.`,
          },
        ],
      });

      // Extract suggestions from the response
      let newSuggestions: string[] = [];
      if (response.content[0].type === "text") {
        newSuggestions = response.content[0].text
          .split(/\d+\.\s+/)
          .filter(s => s.trim().length > 0)
          .map(s => s.trim())
          .filter(s => s.length >= 10 && s.length <= 150);
      }

      // Save new suggestions to database
      const suggestionRecords = newSuggestions.map(text => ({
        userId: user.id,
        text,
        category: "chat",
        type: "context_based",
        source: "ai_generated",
        context: context.substring(0, 100) + "...",
        relevance: 1.0,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }));

      if (suggestionRecords.length > 0) {
        await db.insert(promptSuggestions).values(suggestionRecords);
      }

      // Get all active suggestions including newly created ones
      const allSuggestions = await db.query.promptSuggestions.findMany({
        where: and(
          eq(promptSuggestions.userId, user.id),
          isNull(promptSuggestions.usedAt),
          isNull(promptSuggestions.dismissedAt)
        ),
        limit: 5,
      });

      res.json(allSuggestions);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch or generate chat suggestions");
    }
  });

  return router;
}