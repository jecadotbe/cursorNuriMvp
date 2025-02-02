import { Router } from "express";
import { db } from "@db";
import { promptSuggestions, suggestionFeedback, chats, villageMembers, parentProfiles } from "@db/schema";
import { eq, desc, and, isNull, gte, or, in as dbIn } from "drizzle-orm";
import { generateVillageSuggestions } from "../../lib/suggestion-generator";
import { memoryService } from "../../services/memory";
import type { User } from "../../auth";

const SUGGESTION_CATEGORIES = {
  LEARNING: "learning",
  VILLAGE: "village",
  CHILD_DEVELOPMENT: "child_development",
  STRESS: "stress",
  PERSONAL_GROWTH: "personal_growth"
} as const;

const VILLAGE_SUGGESTION_TYPES = [
  'village_maintenance',
  'network_growth',
  'network_expansion'
] as const;

export function setupSuggestionsRoutes(router: Router) {
  // Get suggestions with optional village context
  router.get("/suggestions", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).send("Not authenticated");
      }

      const user = req.user as User;
      const now = new Date();
      const context = req.query.context as string | undefined;

      // If village context is requested, generate village-specific suggestions
      if (context === 'village') {
        console.log('Fetching village suggestions for user:', user.id);

        // 1. Get village members
        const members = await db.query.villageMembers.findMany({
          where: eq(villageMembers.userId, user.id),
        });

        // 2. Get parent profile and child profiles
        const parentProfile = await db.query.parentProfiles.findFirst({
          where: eq(parentProfiles.userId, user.id),
        });

        if (!parentProfile) {
          console.log('No parent profile found for user:', user.id);
          return res.json([]);
        }

        // 3. Get recent chats
        const recentChats = await db.query.chats.findMany({
          where: eq(chats.userId, user.id),
          orderBy: desc(chats.updatedAt),
          limit: 3
        });

        // 4. Prepare context object
        const villageContext = {
          recentChats,
          parentProfile,
          childProfiles: Array.isArray(parentProfile.onboardingData?.childProfiles) 
            ? parentProfile.onboardingData.childProfiles 
            : [],
          challenges: parentProfile.onboardingData?.stressAssessment?.primaryConcerns || [],
          memories: [] // Will be fetched in generateVillageSuggestions
        };

        // 5. Get existing village suggestions
        const existingVillageSuggestions = await db.query.promptSuggestions.findMany({
          where: and(
            eq(promptSuggestions.userId, user.id),
            isNull(promptSuggestions.usedAt),
            gte(promptSuggestions.expiresAt, now),
            dbIn(promptSuggestions.type, ['village_maintenance', 'network_growth', 'network_expansion'])
          ),
          orderBy: desc(promptSuggestions.createdAt),
        });

        console.log(`Found ${existingVillageSuggestions.length} existing village suggestions`);

        // Generate new suggestions if we don't have enough
        if (existingVillageSuggestions.length < 3) {
          console.log('Generating new village suggestions');
          const newSuggestions = await generateVillageSuggestions(
            user.id,
            members,
            villageContext,
            memoryService
          );

          if (newSuggestions.length > 0) {
            const [inserted] = await db.insert(promptSuggestions).values(newSuggestions).returning();
            console.log(`Generated and inserted ${newSuggestions.length} new suggestions`);
            return res.json([...existingVillageSuggestions, ...newSuggestions]);
          }
        }

        return res.json(existingVillageSuggestions);
      }

      // Default suggestion handling for non-village contexts
      const existingSuggestions = await db.query.promptSuggestions.findMany({
        where: and(
          eq(promptSuggestions.userId, user.id),
          isNull(promptSuggestions.usedAt),
          gte(promptSuggestions.expiresAt, now),
        ),
        orderBy: desc(promptSuggestions.createdAt),
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
      const suggestion = await db.query.promptSuggestions.findFirst({
        where: and(
          eq(promptSuggestions.id, suggestionId),
          eq(promptSuggestions.userId, user.id),
        ),
      });

      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }

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

  // Mark suggestion as used
  router.post("/suggestions/:id/use", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const suggestionId = parseInt(req.params.id);

    if (isNaN(suggestionId)) {
      return res.status(400).json({ message: "Invalid suggestion ID" });
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
        return res.status(404).json({ message: "Suggestion not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error marking suggestion as used:", error);
      res.status(500).json({ message: "Failed to mark suggestion as used" });
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