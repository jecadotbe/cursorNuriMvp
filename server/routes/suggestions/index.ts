import { Router } from "express";
import { db } from "@db";
import {
  promptSuggestions,
  suggestionFeedback,
  parentProfiles,
} from "@db/schema";
import { eq, desc, and, isNull, gte } from "drizzle-orm";
import { anthropic } from "../../anthropic";
import type { User } from "../../auth";
import { memoryService } from "../../services/memory";
import { getVillageContext } from "../village";

const SUGGESTION_CATEGORIES = {
  LEARNING: "learning",
  VILLAGE: "village",
  CHILD_DEVELOPMENT: "child_development",
  STRESS: "stress",
  PERSONAL_GROWTH: "personal_growth"
} as const;

export function setupSuggestionRouter(router: Router) {
  // Submit feedback for a suggestion
  router.post("/:id/feedback", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
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
      // Check if suggestion exists and belongs to user
      const suggestion = await db.query.promptSuggestions.findFirst({
        where: and(
          eq(promptSuggestions.id, suggestionId),
          eq(promptSuggestions.userId, user.id),
        ),
      });

      if (!suggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }

      // Save the feedback
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

  // Get cached suggestion for homepage
  router.get("/", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;
    const now = new Date();
    const forceRefresh = req.query.refresh === 'true';

    try {
      // Get existing valid suggestions first
      const existingSuggestions = await db.query.promptSuggestions.findMany({
        where: and(
          eq(promptSuggestions.userId, user.id),
          isNull(promptSuggestions.usedAt),
          gte(promptSuggestions.expiresAt, now)
        ),
        orderBy: desc(promptSuggestions.createdAt),
        limit: 3
      });

      if (!forceRefresh && existingSuggestions.length >= 3) {
        return res.json(existingSuggestions);
      }

      // Get user's profile and context
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      const villageContextString = await getVillageContext(user.id);

      // Build personalized context
      let personalizedContext = "";
      if (profile?.onboardingData) {
        personalizedContext = `
Parent's Profile:
- Experience Level: ${profile.experienceLevel}
- Stress Level: ${profile.stressLevel}
- Primary Concerns: ${profile.primaryConcerns?.join(", ") || "None specified"}
${Array.isArray(profile.onboardingData.childProfiles) ? profile.onboardingData.childProfiles
    .map((child: any) =>
      `Child: ${child.name}, Age: ${child.age}${child.specialNeeds?.length ? `, Special needs: ${child.specialNeeds.join(", ")}` : ""}`
    )
    .join("\n") : "No children profiles specified"}

Goals:
${profile.onboardingData.goals?.shortTerm?.length ? `- Short term goals: ${profile.onboardingData.goals.shortTerm.join(", ")}` : ""}
${profile.onboardingData.goals?.longTerm?.length ? `- Long term goals: ${profile.onboardingData.goals.longTerm.join(", ")}` : ""}
`;
      }

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        system: `Generate suggestions based on these priorities: ${Object.values(SUGGESTION_CATEGORIES).join(", ")}

${personalizedContext ? `Consider this parent's profile and context:\n${personalizedContext}\n` : ""}
${villageContextString ? `Village context:\n${villageContextString}` : ""}

Generate varied suggestions focusing on the user's priorities. For new users or those with limited chat history, focus on their onboarding information to provide personalized suggestions.`,
        messages: [
          {
            role: "user",
            content: `Based on the parent's profile and context, generate a suggestion that aligns with their priorities and needs. Format the response exactly like this:
{
  "prompt": {
    "text": "follow-up question or suggestion",
    "type": "action" | "follow_up",
    "category": "${Object.values(SUGGESTION_CATEGORIES).join('" | "')}",
    "relevance": 1.0,
    "context": "new" | "existing"
  }
}`,
          },
        ],
      });

      const responseText = response.content[0].type === "text" ? response.content[0].text : "";
      let parsedResponse;

      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Could not extract valid JSON from response");
        }
        parsedResponse = JSON.parse(jsonMatch[0]);
      }

      if (!parsedResponse?.prompt?.text) {
        throw new Error("Response missing required prompt structure");
      }

      // Generate suggestion with dynamic title
      const titleResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 50,
        messages: [{
          role: "user",
          content: `Generate a short, descriptive title (max 5 words) for this suggestion: "${parsedResponse.prompt.text}"`
        }]
      });

      const generatedTitle = titleResponse.content[0].type === "text" ? titleResponse.content[0].text.trim() : "New Suggestion";

      const [suggestion] = await db
        .insert(promptSuggestions)
        .values({
          userId: user.id,
          text: parsedResponse.prompt.text,
          type: parsedResponse.prompt.type,
          category: parsedResponse.prompt.category,
          context: parsedResponse.prompt.context,
          title: generatedTitle,
          relevance: Math.floor(parsedResponse.prompt.relevance * 10),
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Expire in 24 hours
        })
        .returning();

      // Combine with existing suggestions
      const allSuggestions = [...existingSuggestions, suggestion].slice(0, 3);
      res.json(allSuggestions);

    } catch (error) {
      console.error("Suggestion generation error:", error);
      res.status(500).json({
        error: "Failed to generate suggestion",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Dismiss a suggestion
  router.post("/:id/dismiss", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
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

  // Mark a suggestion as used
  router.post("/:id/use", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;
    const suggestionId = parseInt(req.params.id);

    if (isNaN(suggestionId)) {
      return res.status(400).json({ message: "Invalid suggestion ID" });
    }

    try {
      const [updated] = await db
        .update(promptSuggestions)
        .set({ usedAt: new Date() })
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
      res.status(500).json({ message: "Failed to update suggestion" });
    }
  });

  return router;
}
