
import { Router } from "express";
import { db } from "@db";
import { chats, promptSuggestions, villageMembers } from "@db/schema";
import { eq, desc, and, isNull, gte } from "drizzle-orm";
import { User } from "../../auth";
import { detectPotentialMembers } from "../../services/member-detection";

export const memberSuggestionsRouter = Router();

memberSuggestionsRouter.get("/", async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user as User;
    const now = new Date();
    
    // First, check if we have existing member suggestions
    const existingSuggestions = await db.query.promptSuggestions.findMany({
      where: and(
        eq(promptSuggestions.userId, user.id),
        eq(promptSuggestions.type, "member_suggestion"),
        isNull(promptSuggestions.usedAt),
        gte(promptSuggestions.expiresAt, now)
      ),
      orderBy: desc(promptSuggestions.createdAt),
    });

    if (existingSuggestions.length > 0) {
      return res.json(existingSuggestions);
    }
    
    // If no existing suggestions, we'll generate new ones
    // Get existing village members to avoid duplicates
    const existingMembers = await db.query.villageMembers.findMany({
      where: eq(villageMembers.userId, user.id),
    });
    
    // Get recent chat messages
    const recentChats = await db.query.chats.findMany({
      where: eq(chats.userId, user.id),
      orderBy: desc(chats.updatedAt),
      limit: 5,
    });
    
    // Combine messages from recent chats
    const allMessages = recentChats.flatMap(chat => 
      Array.isArray(chat.messages) ? chat.messages : []
    );
    
    // Detect potential members
    const detectedMembers = await detectPotentialMembers(
      allMessages,
      existingMembers
    );
    
    if (detectedMembers.length === 0) {
      return res.json([]);
    }
    
    // Convert detected members to suggestions
    const newSuggestions = detectedMembers.map((member, index) => ({
      userId: user.id,
      title: `Voeg ${member.name} toe aan je village`,
      text: `${member.name} is genoemd in je gesprekken. Wil je ${member.name} toevoegen aan je village?`,
      type: "member_suggestion",
      category: "village",
      context: member.context,
      relevance: 10, // High relevance since explicitly mentioned
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      metadata: {
        name: member.name,
        type: member.type || "individual",
        circle: member.circle || 2,
        category: member.category || "informeel",
        contactFrequency: member.contactFrequency || "M",
      }
    }));
    
    // Save the new suggestions
    const savedSuggestions = await db
      .insert(promptSuggestions)
      .values(newSuggestions)
      .returning();
    
    return res.json(savedSuggestions);
  } catch (error) {
    console.error("Error generating member suggestions:", error);
    return res.status(500).json({
      error: "Failed to generate member suggestions",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
