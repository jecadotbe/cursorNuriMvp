import { Router } from "express";
import { db } from "@db";
import { promptSuggestions, suggestionFeedback, chats, villageMembers, parentProfiles } from "@db/schema";
import { eq, desc, and, isNull, gte } from "drizzle-orm";
import { generateVillageSuggestions } from "../../lib/suggestion-generator";
import { memoryService } from "../../services/memory";
import type { User } from "../../auth";

// Error handler middleware for JSON responses
const jsonErrorHandler = (err: any, req: any, res: any, next: any) => {
  console.error('Error in suggestions route:', err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

export function setupSuggestionsRoutes(router: Router) {
  // Ensure JSON content type for all responses in this router
  router.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Dedicated endpoint for village suggestions
  router.get("/suggestions/village", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = req.user as User;
      const now = new Date();

      console.log('Fetching village suggestions for user:', user.id);

      // 1. Get village members with error handling
      const members = await db.query.villageMembers.findMany({
        where: eq(villageMembers.userId, user.id),
      }).catch(error => {
        console.error('Error fetching village members:', error);
        throw new Error('Failed to fetch village members');
      });

      // 2. Get parent profile with error handling
      const parentProfile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      }).catch(error => {
        console.error('Error fetching parent profile:', error);
        throw new Error('Failed to fetch parent profile');
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
        throw new Error('Failed to fetch recent chats');
      });

      // 4. Prepare context object with safe defaults
      const villageContext = {
        recentChats: recentChats.map(chat => ({
          ...chat,
          messages: Array.isArray(chat.messages) ? chat.messages : []
        })),
        parentProfile,
        childProfiles: parentProfile.onboardingData?.childProfiles || [],
        challenges: parentProfile.onboardingData?.stressAssessment?.primaryConcerns || [],
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
        throw new Error('Failed to fetch existing suggestions');
      });

      console.log(`Found ${existingVillageSuggestions.length} existing village suggestions`);

      // Generate new suggestions if we don't have enough
      console.log('Existing village suggestions count:', existingVillageSuggestions.length);
      
      if (existingVillageSuggestions.length < 3) {
        console.log('Generating new village suggestions');
        try {
          console.log('Context for generation:', {
            userId: user.id,
            memberCount: members.length,
            parentProfile: !!parentProfile
          });
          
          const newSuggestions = await generateVillageSuggestions(
            user.id,
            members,
            villageContext,
            memoryService
          );

          console.log('Generated suggestions:', newSuggestions);

          if (newSuggestions && newSuggestions.length > 0) {
            const inserted = await db.insert(promptSuggestions)
              .values(newSuggestions)
              .returning();

            console.log('Inserted suggestions:', inserted);
            return res.json([...existingVillageSuggestions, ...inserted]);
          }
        } catch (error) {
          console.error('Error generating/inserting suggestions:', error);
          return res.status(500).json({ 
            error: "Failed to generate suggestions",
            message: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      console.log('Returning village suggestions:', existingVillageSuggestions);
      return res.json(existingVillageSuggestions);
    } catch (error) {
      console.error('Caught error in village suggestions route:', error);
      return res.status(500).json({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error"
      });
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
      console.error('Error fetching suggestions:', error);
      res.status(500).json({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Mark suggestion as used
  router.post("/suggestions/:id/use", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = req.user as User;
      const suggestionId = parseInt(req.params.id);

      if (isNaN(suggestionId)) {
        return res.status(400).json({ error: "Invalid suggestion ID" });
      }

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
      console.error('Error marking suggestion as used:', error);
      res.status(500).json({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Apply JSON error handler to all routes in this router
  router.use(jsonErrorHandler);

  return router;
}