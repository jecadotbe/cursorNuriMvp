import { Router } from "express";
import { db } from "@db";
import { promptSuggestions } from "@db/schema";
import { desc, eq, and, isNull, gte } from "drizzle-orm";
import type { User } from "../../auth";

export const memberSuggestionsRouter = Router();

// Get member suggestions
memberSuggestionsRouter.get("/", async (req, res) => {
  try {
    const user = req.user as User;
    const suggestions = await db.query.promptSuggestions.findMany({
      where: and(
        eq(promptSuggestions.userId, user.id),
        isNull(promptSuggestions.usedAt),
        gte(promptSuggestions.expiresAt, new Date())
      ),
      orderBy: desc(promptSuggestions.createdAt),
      limit: 5
    });
    
    res.json(suggestions);
  } catch (error) {
    console.error("Failed to fetch member suggestions:", error);
    res.status(500).json({ 
      message: "Failed to fetch member suggestions",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
