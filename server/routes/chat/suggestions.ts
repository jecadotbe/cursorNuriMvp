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

      // For testing: Add mock suggestions if none exist
      if (existingVillageSuggestions.length < 3) {
        console.log('Adding mock village suggestions');
        try {
          const mockSuggestions = [
            // Network Growth suggestions
            {
              userId: user.id,
              text: "Schedule a weekly coffee catch-up with Sarah from your inner circle to strengthen your bond",
              type: "network_growth",
              context: "village",
              relevance: 9,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdAt: new Date()
            },
            {
              userId: user.id,
              text: "Plan a playdate with Tom's family to deepen your parenting support connection",
              type: "network_growth",
              context: "village",
              relevance: 8,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdAt: new Date()
            },
            // Network Expansion suggestions
            {
              userId: user.id,
              text: "Join the local parent-teacher association to expand your parenting network",
              type: "network_expansion",
              context: "village",
              relevance: 7,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdAt: new Date()
            },
            {
              userId: user.id,
              text: "Consider reaching out to Emma, who also has a child with similar interests",
              type: "network_expansion",
              context: "village",
              relevance: 8,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdAt: new Date()
            },
            // Village Maintenance suggestions
            {
              userId: user.id,
              text: "It's been two weeks since you last connected with your sister - send her a message",
              type: "village_maintenance",
              context: "village",
              relevance: 9,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdAt: new Date()
            },
            {
              userId: user.id,
              text: "Check in with your neighbor John about the upcoming community event",
              type: "village_maintenance",
              context: "village",
              relevance: 7,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdAt: new Date()
            },
            {
              userId: user.id,
              text: "Plan a monthly family dinner with your parents to maintain regular contact",
              type: "village_maintenance",
              context: "village",
              relevance: 8,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdAt: new Date()
            },
            {
              userId: user.id,
              text: "Reconnect with your old friend Lisa who recently became a parent",
              type: "network_growth",
              context: "village",
              relevance: 8,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdAt: new Date()
            },
            {
              userId: user.id,
              text: "Join the weekend parent support group at the community center",
              type: "network_expansion",
              context: "village",
              relevance: 7,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdAt: new Date()
            },
            {
              userId: user.id,
              text: "Schedule a video call with your mentor to discuss recent parenting challenges",
              type: "village_maintenance",
              context: "village",
              relevance: 9,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdAt: new Date()
            }
          ];

          const newSuggestions = mockSuggestions;

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
          return res.json(existingVillageSuggestions);
        }
      }

      return res.json(existingVillageSuggestions);

            console.log(`Generated and inserted ${inserted.length} new suggestions`);
            return res.json([...existingVillageSuggestions, ...inserted]);
          }
        } catch (error) {
          console.error('Error generating new suggestions:', error);
          return res.json(existingVillageSuggestions);
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