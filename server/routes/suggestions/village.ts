import { Router } from "express";
import { db } from "@db";
import { promptSuggestions, villageMembers, parentProfiles, children } from "@db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { anthropic } from "../../anthropic";
import { memoryService } from "../../services/memory";
import { generateVillageSuggestions } from "../../lib/suggestion-generator";
import { VILLAGE_RULES, analyzeVillageGaps } from "../../lib/village-rules";
import { handleRouteError } from "../utils/error-handler";
import { ensureAuthenticated } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";

export function setupVillageSuggestions(router: Router) {
  // Get village-specific suggestions
  router.get("/village", ensureAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      // Check if we need to refresh suggestions (either from session flag or query param)
      const forceRefresh = req.query.refresh === "true" || req.session?.checkSuggestions || false;
      if (req.session?.checkSuggestions) {
        req.session.checkSuggestions = false;
        await req.session.save();
      }

      // First try to get existing active village suggestions
      const existingSuggestions = await db.query.promptSuggestions.findMany({
        where: and(
          eq(promptSuggestions.userId, user.id),
          isNull(promptSuggestions.dismissedAt),
          isNull(promptSuggestions.usedAt),
          eq(promptSuggestions.category, "village")
        ),
        orderBy: [desc(promptSuggestions.createdAt)],
        limit: 5,
      });

      // If we have enough suggestions and don't need to refresh, return them
      if (existingSuggestions.length >= 2 && !forceRefresh) {
        return res.json(existingSuggestions);
      }

      // Get parent profile
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      if (!profile) {
        return res.status(404).json({ message: "Parent profile not found" });
      }

      // Get village members
      const members = await db.query.villageMembers.findMany({
        where: eq(villageMembers.userId, user.id),
      });

      // Get children
      const userChildren = await db.query.children.findMany({
        where: eq(children.userId, user.id),
      });

      // Get relevant memories
      const memories = await memoryService.getRelevantMemories(
        user.id,
        "What village support does this parent need?",
        'suggestion'
      );

      // Analyze village gaps and needs
      const gapAnalysis = analyzeVillageGaps(members);

      // Generate village suggestions using the suggestion generator
      const villageSuggestions = await generateVillageSuggestions(
        {
          recentChats: [],
          parentProfile: profile,
          childProfiles: userChildren.map(child => ({
            name: child.name,
            age: child.age,
            specialNeeds: child.specialNeeds || [],
          })),
          challenges: profile.primaryConcerns?.map(concern => ({
            id: 0,
            userId: user.id,
            description: concern,
            createdAt: new Date(),
            updatedAt: new Date(),
          })) || [],
          memories,
        },
        memoryService
      );

      // Save generated suggestions to database
      if (villageSuggestions.length > 0) {
        const suggestionRecords = villageSuggestions.map(suggestion => ({
          userId: user.id,
          text: suggestion.text,
          category: "village",
          context: suggestion.context || null,
          source: "ai_generated",
          type: suggestion.type || null,
          priority: suggestion.priority || 1,
        }));

        await db.insert(promptSuggestions).values(suggestionRecords);

        // Get all active village suggestions including newly created ones
        const allSuggestions = await db.query.promptSuggestions.findMany({
          where: and(
            eq(promptSuggestions.userId, user.id),
            isNull(promptSuggestions.dismissedAt),
            isNull(promptSuggestions.usedAt),
            eq(promptSuggestions.category, "village")
          ),
          orderBy: [desc(promptSuggestions.createdAt)],
          limit: 5,
        });

        return res.json(allSuggestions);
      }

      // If we couldn't generate new suggestions, return existing ones
      return res.json(existingSuggestions);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch or generate village suggestions");
    }
  });

  return router;
}