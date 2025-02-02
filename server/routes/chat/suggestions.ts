import { Router } from "express";
import { db } from "@db";
import { promptSuggestions, suggestionFeedback, chats, villageMembers, parentProfiles } from "@db/schema";
import { eq, desc, and, isNull, gte } from "drizzle-orm";
import { generateVillageSuggestions } from "../../lib/suggestion-generator";
import { memoryService } from "../../services/memory";
import type { User } from "../../auth";

export function setupSuggestionsRoutes(router: Router) {
  // Dedicated endpoint for village suggestions
  router.get("/suggestions/village", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = req.user as User;
      const now = new Date();

      console.log('Fetching village suggestions for user:', user.id);

      // Set proper content type header
      res.setHeader('Content-Type', 'application/json');

      // 1. Get village members with error handling
      const members = await db.query.villageMembers.findMany({
        where: eq(villageMembers.userId, user.id),
      }).catch(error => {
        console.error('Error fetching village members:', error);
        return [];
      });

      // 2. Get parent profile with error handling
      const parentProfile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      }).catch(error => {
        console.error('Error fetching parent profile:', error);
        return null;
      });

      if (!parentProfile) {
        console.log('No parent profile found for user:', user.id);
        return res.json([]);
      }

      // 3. Get recent chats with error handling
      const recentChats = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: desc(chats.updatedAt),
        limit: 3
      }).catch(error => {
        console.error('Error fetching recent chats:', error);
        return [];
      });

      // 4. Prepare context object with safe defaults
      const villageContext = {
        recentChats,
        parentProfile,
        childProfiles: parentProfile?.onboardingData?.childProfiles || [],
        challenges: parentProfile?.onboardingData?.stressAssessment?.primaryConcerns || [],
        memories: []
      };

      // 5. Get existing village suggestions with type filtering
      const existingVillageSuggestions = await db.query.promptSuggestions.findMany({
        where: and(
          eq(promptSuggestions.userId, user.id),
          isNull(promptSuggestions.usedAt),
          gte(promptSuggestions.expiresAt, now),
          eq(promptSuggestions.context, 'village')
        ),
        orderBy: desc(promptSuggestions.createdAt),
      }).catch(error => {
        console.error('Error fetching existing village suggestions:', error);
        return [];
      });

      console.log(`Found ${existingVillageSuggestions.length} existing village suggestions`);

      // Generate new suggestions if we don't have enough
      if (existingVillageSuggestions.length < 3) {
        console.log('Generating new village suggestions');
        try {
          const newSuggestions = await generateVillageSuggestions(
            user.id,
            members,
            villageContext,
            memoryService
          );

          if (newSuggestions && newSuggestions.length > 0) {
            const inserted = await db.insert(promptSuggestions)
              .values(newSuggestions)
              .returning()
              .catch(error => {
                console.error('Error inserting new suggestions:', error);
                return [];
              });

            console.log(`Generated and inserted ${newSuggestions.length} new suggestions`);

            // Combine existing and new suggestions
            const allSuggestions = [...existingVillageSuggestions, ...inserted];
            return res.json(allSuggestions);
          }
        } catch (error) {
          console.error('Error generating new suggestions:', error);
          // Return existing suggestions even if generation fails
          return res.json(existingVillageSuggestions);
        }
      }

      // Return existing suggestions if generation wasn't needed
      return res.json(existingVillageSuggestions);
    } catch (error) {
      console.error('Error in /suggestions/village:', error);
      return res.status(500).json({ error: "Failed to fetch village suggestions" });
    }
  });

  // Regular suggestions endpoint
  router.get("/suggestions", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = req.user as User;
      const now = new Date();

      const suggestions = await db.query.promptSuggestions.findMany({
        where: and(
          eq(promptSuggestions.userId, user.id),
          isNull(promptSuggestions.usedAt),
          gte(promptSuggestions.expiresAt, now)
        ),
        orderBy: desc(promptSuggestions.createdAt),
      });

      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
    }
  });

  // Mark suggestion as used
  router.post("/suggestions/:id/use", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user as User;
    const suggestionId = parseInt(req.params.id);

    if (isNaN(suggestionId)) {
      return res.status(400).json({ error: "Invalid suggestion ID" });
    }

    try {
      const [updated] = await db
        .update(promptSuggestions)
        .set({
          usedAt: new Date(),
        })
        .where(
          and(
            eq(promptSuggestions.id, suggestionId),
            eq(promptSuggestions.userId, user.id),
          ),
        )
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Suggestion not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error marking suggestion as used:", error);
      res.status(500).json({ error: "Failed to mark suggestion as used" });
    }
  });

  return router;
}