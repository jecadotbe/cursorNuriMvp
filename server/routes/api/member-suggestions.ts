import { Router, Request, Response } from "express";
import { db } from "@db/index";
import { and, eq, isNull, gte, desc } from "drizzle-orm";
import { promptSuggestions } from "@db/schema";
import type { User } from "@db/schema";

export const memberSuggestionsRouter = Router();

export const handleMemberSuggestions = async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user as User;
    const now = new Date();
    const type = req.query.type as string;

    // Filter conditions
    const conditions = [
      eq(promptSuggestions.userId, user.id),
      isNull(promptSuggestions.usedAt),
      gte(promptSuggestions.expiresAt, now),
    ];

    // Add type filter if provided
    if (type === 'village') {
      // Filter for village-related suggestion types
      conditions.push(
        db.or(
          eq(promptSuggestions.type, 'network_growth'),
          eq(promptSuggestions.type, 'network_expansion'),
          eq(promptSuggestions.type, 'village_maintenance')
        )
      );
    }

    // Get suggestions from the database
    const suggestions = await db.query.promptSuggestions.findMany({
      where: and(...conditions),
      orderBy: desc(promptSuggestions.createdAt),
    });

    return res.json(suggestions);
  } catch (error) {
    console.error("Error getting member suggestions:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
};

memberSuggestionsRouter.get("/", handleMemberSuggestions);

// Refresh suggestions endpoint
memberSuggestionsRouter.post("/refresh", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = req.user as User;
    
    // Generate new suggestions
    const { members, villageContext } = await getVillageContext(user.id);
    
    const newSuggestions = await generateVillageSuggestions(
      user.id,
      members,
      villageContext,
      memoryService
    );

    // Store new suggestions
    if (newSuggestions.length > 0) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      const suggestionsToInsert = newSuggestions.map(suggestion => ({
        ...suggestion,
        userId: user.id,
        expiresAt
      }));
      
      await db.insert(promptSuggestions).values(suggestionsToInsert);
      
      console.log(`Generated ${newSuggestions.length} new suggestions for user ${user.id}`);
    }

    // Return success
    res.json({ success: true, message: "Suggestions refreshed" });
  } catch (error) {
    console.error('Error in POST /member-suggestions/refresh:', error);
    res.status(500).json({ 
      error: "Internal server error", 
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Helper function to get village context
async function getVillageContext(userId: number) {
  const members = await db.query.villageMembers.findMany({
    where: eq(villageMembers.userId, userId),
  });

  const recentChats = await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: desc(chats.updatedAt),
    limit: 3
  });

  const parentProfile = await db.query.parentProfiles.findFirst({
    where: eq(parentProfiles.userId, userId),
  });

  const villageContext = {
    recentChats: recentChats.map(chat => ({
      ...chat,
      messages: Array.isArray(chat.messages) ? chat.messages : []
    })),
    parentProfile,
    childProfiles: parentProfile?.onboardingData?.childProfiles || [],
    challenges: parentProfile?.onboardingData?.stressAssessment?.primaryConcerns || [],
    memories: []
  };

  return { members, villageContext };
}

// Helper function for OR condition (This is unnecessary given the use of db.or)
// function or(...conditions: any[]) {
//   return ({ or: conditions });
// }

import { memoryService } from "../../services/memory";
import { generateVillageSuggestions } from "../../lib/suggestion-generator";
import type { villageMembers } from "@db/schema";
import type { chats } from "@db/schema";
import type { parentProfiles } from "@db/schema";