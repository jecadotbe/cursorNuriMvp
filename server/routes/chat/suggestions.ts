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
  router.get("/suggestions/village", async (req, res, next) => {
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
        recentChats: recentChats.map(chat => ({
          ...chat,
          messages: Array.isArray(chat.messages) ? chat.messages : []
        })),
        parentProfile,
        childProfiles: Array.isArray(parentProfile?.onboardingData?.childProfiles) 
          ? parentProfile.onboardingData.childProfiles 
          : [],
        challenges: Array.isArray(parentProfile?.onboardingData?.stressAssessment?.primaryConcerns)
          ? parentProfile.onboardingData.stressAssessment.primaryConcerns
          : [],
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

          console.log('Generated suggestions:', newSuggestions);

          if (newSuggestions && newSuggestions.length > 0) {
            try {
              const inserted = await db.insert(promptSuggestions)
                .values(newSuggestions)
                .returning();

              console.log('Inserted suggestions:', inserted);
              return res.json([...existingVillageSuggestions, ...inserted]);
            } catch (dbError) {
              console.error('Database error while inserting suggestions:', dbError);
              throw dbError;
            }
          } else {
            console.log('No new suggestions generated');
            return res.json(existingVillageSuggestions);
          }
        } catch (error) {
          console.error('Error in suggestion generation process:', error);
          throw error;
        }
      }

      return res.json(existingVillageSuggestions);
    } catch (error) {
      next(error); // Pass to error handler
    }
  });

  // Regular suggestions endpoint with proper error handling
  router.get("/suggestions", async (req, res, next) => {
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
      next(error); // Pass to error handler
    }
  });

  // Mark suggestion as used with proper error handling
  router.post("/suggestions/:id/use", async (req, res, next) => {
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
      next(error); // Pass to error handler
    }
  });

  // Apply JSON error handler to all routes in this router
  router.use(jsonErrorHandler);

  return router;
}