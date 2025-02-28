import { Router } from "express";
import { db } from "@db";
import { promptSuggestions, suggestionFeedback } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { handleRouteError } from "../utils/error-handler";
import { parseChatId } from "../utils/param-parser";
import { ensureAuthenticated } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";

export function setupFeedbackRoutes(router: Router) {
  // Mark suggestion as used
  router.post("/:id/use", ensureAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const suggestionId = parseChatId(req.params.id);
      if (!suggestionId) return res.status(400).json({ message: "Invalid suggestion ID" });

      // Verify the suggestion belongs to the user
      const suggestion = await db.query.promptSuggestions.findFirst({
        where: and(
          eq(promptSuggestions.id, suggestionId),
          eq(promptSuggestions.userId, user.id)
        ),
      });

      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }

      // Mark the suggestion as used
      await db
        .update(promptSuggestions)
        .set({
          usedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(promptSuggestions.id, suggestionId));

      res.json({ message: "Suggestion marked as used" });
    } catch (error) {
      handleRouteError(res, error, "Failed to mark suggestion as used");
    }
  });

  // Dismiss suggestion
  router.post("/:id/dismiss", ensureAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const suggestionId = parseChatId(req.params.id);
      if (!suggestionId) return res.status(400).json({ message: "Invalid suggestion ID" });

      // Verify the suggestion belongs to the user
      const suggestion = await db.query.promptSuggestions.findFirst({
        where: and(
          eq(promptSuggestions.id, suggestionId),
          eq(promptSuggestions.userId, user.id)
        ),
      });

      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }

      // Mark the suggestion as dismissed
      await db
        .update(promptSuggestions)
        .set({
          dismissedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(promptSuggestions.id, suggestionId));

      res.json({ message: "Suggestion dismissed" });
    } catch (error) {
      handleRouteError(res, error, "Failed to dismiss suggestion");
    }
  });

  // Submit feedback for a suggestion
  router.post("/:id/feedback", ensureAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const suggestionId = parseChatId(req.params.id);
      if (!suggestionId) return res.status(400).json({ message: "Invalid suggestion ID" });

      const { rating, comment } = req.body;
      if (typeof rating !== "number" || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Invalid rating. Must be between 1 and 5" });
      }

      // Verify the suggestion belongs to the user
      const suggestion = await db.query.promptSuggestions.findFirst({
        where: and(
          eq(promptSuggestions.id, suggestionId),
          eq(promptSuggestions.userId, user.id)
        ),
      });

      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }

      // Create feedback record
      await db.insert(suggestionFeedback).values({
        suggestionId,
        userId: user.id,
        rating,
        comment: comment || null,
      });

      res.json({ message: "Feedback submitted successfully" });
    } catch (error) {
      handleRouteError(res, error, "Failed to submit feedback");
    }
  });

  return router;
}