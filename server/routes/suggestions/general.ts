import { Router } from "express";
import { db } from "@db";
import { promptSuggestions, chats, messageFeedback, parentProfiles } from "@db/schema";
import { eq, desc, and, isNull, gte } from "drizzle-orm";
import { anthropic } from "../../anthropic";
import { memoryService } from "../../services/memory";
import { handleRouteError } from "../utils/error-handler";
import { ensureAuthenticated } from "../middleware/auth";
import { AuthenticatedRequest, SUGGESTION_CATEGORIES } from "../types";

// System prompt for suggestion generation
const SUGGESTION_SYSTEM_PROMPT = `You are a parent coaching AI assistant. Generate personalized suggestions for parents based on their profile, recent chats, and parenting challenges.

Your suggestions should be:
1. Specific to the parent's situation and challenges
2. Actionable and practical
3. Conversational and supportive in tone
4. Between 60-100 characters long
5. Written in Dutch or Flemish natural language

Each suggestion should be a complete thought that can stand alone as a prompt for the user to engage with.`;

export function setupGeneralSuggestions(router: Router) {
  // Get suggestions
  router.get("/", ensureAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      // Check if we need to refresh suggestions (either from session flag or if it's been over 4 hours)
      const needsRefresh = req.session?.checkSuggestions || false;
      if (needsRefresh && req.session) {
        req.session.checkSuggestions = false;
        await req.session.save();
      }

      // First, try to get existing active suggestions
      const existingSuggestions = await db.query.promptSuggestions.findMany({
        where: and(
          eq(promptSuggestions.userId, user.id),
          isNull(promptSuggestions.dismissedAt),
          isNull(promptSuggestions.usedAt)
        ),
        orderBy: [desc(promptSuggestions.createdAt)],
        limit: 10,
      });

      // If we have enough suggestions and don't need to refresh, return them
      if (existingSuggestions.length >= 3 && !needsRefresh) {
        return res.json(existingSuggestions);
      }

      // Otherwise, we need to generate new suggestions
      // Get user profile and chat history for context
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      const recentChats = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: [desc(chats.updatedAt)],
        limit: 5,
      });

      // Get relevant memories
      const memories = await memoryService.getRelevantMemories(
        user.id,
        "What are this parent's current needs, goals, and challenges?",
        'suggestion'
      );

      // Build context for AI
      const userContext = `
Parent Profile:
${profile ? `
Name: ${profile.name}
Experience Level: ${profile.experienceLevel}
Stress Level: ${profile.stressLevel}
Primary Concerns: ${profile.primaryConcerns?.join(", ") || "None specified"}
` : "No profile information available"}

${profile?.onboardingData?.childProfiles?.length ? `
Children:
${profile.onboardingData.childProfiles.map((child: any) => 
  `- ${child.name} (${child.age} years old)${child.specialNeeds?.length ? 
    `, Special needs: ${child.specialNeeds.join(", ")}` : ""}`
).join("\n")}
` : "No children information available"}

${profile?.onboardingData?.goals ? `
Goals:
${profile.onboardingData.goals.shortTerm?.length ? 
  `Short term: ${profile.onboardingData.goals.shortTerm.join(", ")}` : ""}
${profile.onboardingData.goals.longTerm?.length ? 
  `Long term: ${profile.onboardingData.goals.longTerm.join(", ")}` : ""}
` : ""}

Recent Chat History:
${recentChats.length > 0 ? recentChats.slice(0, 3).map(chat => 
  `- ${chat.title || "Untitled chat"}: ${chat.summary || "No summary available"}`
).join("\n") : "No recent chat history"}

Relevant User Memories:
${memories.length > 0 ? memories.map(memory => `- ${memory.content}`).join("\n") : "No relevant memories"}
`;

      // Generate suggestions using Claude
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        temperature: 0.7,
        system: SUGGESTION_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Based on this parent's profile and history, generate 5 unique, personalized prompt suggestions they might want to ask about in different categories (parenting challenges, child development, stress management):

${userContext}

Generate 5 suggestions in Dutch or Flemish that feel natural and conversational. Each suggestion should be a single sentence or question between 60-100 characters. Make them diverse across different topics relevant to this parent.`,
          },
        ],
      });

      let suggestions: string[] = [];
      if (response.content[0].type === "text") {
        // Extract suggestions from numbered list format
        suggestions = response.content[0].text
          .split(/\d+\.\s+/)
          .filter(s => s.trim().length > 0)
          .map(s => s.trim())
          .filter(s => s.length >= 10 && s.length <= 150);
      }

      console.log("Generated suggestions:", suggestions);

      // Save suggestions to database
      if (suggestions.length > 0) {
        const suggestionRecords = suggestions.map((text, index) => ({
          userId: user.id,
          text,
          category: Object.values(SUGGESTION_CATEGORIES)[
            index % Object.values(SUGGESTION_CATEGORIES).length
          ],
          source: "ai_generated",
          priority: 1,
        }));

        await db.insert(promptSuggestions).values(suggestionRecords);

        // Get all active suggestions including newly created ones
        const allSuggestions = await db.query.promptSuggestions.findMany({
          where: and(
            eq(promptSuggestions.userId, user.id),
            isNull(promptSuggestions.dismissedAt),
            isNull(promptSuggestions.usedAt)
          ),
          orderBy: [desc(promptSuggestions.createdAt)],
          limit: 10,
        });

        return res.json(allSuggestions);
      }

      // If we couldn't generate new suggestions, return existing ones
      return res.json(existingSuggestions);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch or generate suggestions");
    }
  });

  return router;
}