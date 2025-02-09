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

      // Get recent chats to use as context
      const recentChats = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: desc(chats.updatedAt),
        limit: 3
      });

      let chatContext = '';
      if (recentChats.length > 0) {
        // Combine recent chat messages into context
        chatContext = recentChats
          .map(chat => {
            const messages = Array.isArray(chat.messages) ? chat.messages : [];
            return messages
              .map((m: any) => m.content)
              .join(' ');
          })
          .join('\n');
      }

      console.log('Chat context for suggestions:', chatContext || 'No recent chat context');

      // 1. Get village members with error handling
      const members = await db.query.villageMembers.findMany({
        where: eq(villageMembers.userId, user.id),
      });

      // 2. Get parent profile with error handling
      const parentProfile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      if (!parentProfile) {
        console.log('No parent profile found for user:', user.id);
        return res.json([]);
      }

      // 3. Prepare context object
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

      // 4. Get existing suggestions
      const existingVillageSuggestions = await db.query.promptSuggestions.findMany({
        where: and(
          eq(promptSuggestions.userId, user.id),
          isNull(promptSuggestions.usedAt),
          gte(promptSuggestions.expiresAt, now)
        ),
        orderBy: desc(promptSuggestions.createdAt),
      });

      console.log(`Found ${existingVillageSuggestions.length} existing village suggestions`);

      if (existingVillageSuggestions.length < 3) {
        console.log('Generating new village suggestions');
        try {
          // Pass the chat context to the suggestion generator
          const newSuggestions = await generateVillageSuggestions(
            user.id,
            members,
            {
              ...villageContext,
              chatContext // Add chat context to village context
            },
            memoryService
          );

          if (newSuggestions && newSuggestions.length > 0) {
            const inserted = await db.insert(promptSuggestions)
              .values(newSuggestions)
              .returning();

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