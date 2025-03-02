import { Router } from "express";
import { db } from "@db";
import { chats, villageMembers } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import type { User } from "../../auth";
import { extractVillageMembersFromMessage } from "../../services/village-chat-integration";
import { memoryService } from "../../services/memory";

/**
 * Get potential village members from the chat history and memory service
 */
async function getPotentialVillageMembers(userId: number) {
  const potentialMembers = new Map<string, {
    name: string;
    confidence: number;
    source: 'chat' | 'memory';
    mentioned: number;
    lastMention?: Date;
    type?: string;
  }>();

  // 1. Scan chat history for potential members
  try {
    const recentChats = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.createdAt))
      .limit(10); // Get last 10 chats
    
    for (const chat of recentChats) {
      if (chat.messages) {
        const messages = chat.messages as Array<{role: string, content: string}>;
        // Only process user messages
        const userMessages = messages.filter(m => m.role === 'user');
        
        for (const message of userMessages) {
          const detectedMembers = extractVillageMembersFromMessage(message.content);
          
          for (const member of detectedMembers) {
            const lowerName = member.name.toLowerCase();
            if (potentialMembers.has(lowerName)) {
              // Update existing entry
              const existing = potentialMembers.get(lowerName)!;
              existing.mentioned += 1;
              existing.confidence = Math.min(0.9, existing.confidence + 0.1);
              existing.lastMention = chat.createdAt || new Date();
              // Keep the type if it exists
              if (member.type && !existing.type) {
                existing.type = member.type;
              }
            } else {
              // Add new entry
              potentialMembers.set(lowerName, {
                name: member.name,
                confidence: 0.6, // Initial confidence
                source: 'chat',
                mentioned: 1,
                lastMention: chat.createdAt || new Date(),
                type: member.type
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error scanning chat history for potential members:", error);
  }

  // 2. Get relevant memories to find potential members
  try {
    const context = "Who are the people in the user's social network?";
    const memories = await memoryService.getRelevantMemories(userId, context);
    
    for (const memory of memories) {
      if (memory.content) {
        // Look for name patterns in memory content with confidence
        const nameRegex = /\b[A-Z][a-z]+\b/g;
        const names = memory.content.match(nameRegex) || [];
        
        // Filter out common words that are not names
        const commonWords = ["Ik", "Mijn", "De", "Het", "Een", "Dag", "Hoi", "Kan", "Village", "Nuri", "Ponyo"];
        const filteredNames = names.filter(name => !commonWords.includes(name));
        
        for (const name of filteredNames) {
          const lowerName = name.toLowerCase();
          // Check if this looks like a name
          if (name.length > 2) {
            if (potentialMembers.has(lowerName)) {
              // Update existing entry
              const existing = potentialMembers.get(lowerName)!;
              existing.mentioned += 1;
              existing.confidence = Math.min(0.95, existing.confidence + 0.05);
              // Memory source takes precedence if confidence is higher
              if (memory.relevance && memory.relevance > 0.7) {
                existing.source = 'memory';
                existing.confidence = Math.max(existing.confidence, 0.8);
              }
            } else {
              // Determine confidence based on memory relevance
              let confidence = 0.5;
              if (memory.relevance) {
                confidence = memory.relevance > 0.7 ? 0.8 : 0.6;
              }
              
              // Add new entry
              potentialMembers.set(lowerName, {
                name: name,
                confidence,
                source: 'memory',
                mentioned: 1
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error scanning memories for potential members:", error);
  }

  // 3. Get existing village members to filter out
  const existingMembers = await db
    .select()
    .from(villageMembers)
    .where(eq(villageMembers.userId, userId));
  
  const existingNames = new Set(existingMembers.map(m => m.name.toLowerCase()));
  
  // 4. Filter and sort potential members
  const filteredMembers = Array.from(potentialMembers.values())
    .filter(member => !existingNames.has(member.name.toLowerCase()))
    .filter(member => member.confidence > 0.5)
    .sort((a, b) => b.confidence - a.confidence || b.mentioned - a.mentioned);
  
  return filteredMembers.slice(0, 5); // Return top 5 potential members
}

export function setupVillageRecommendationsRoutes(router: Router) {
  /**
   * Endpoint to get recommended village members based on conversation history and memories
   */
  router.get("/village/recommendations", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }
    
    try {
      const user = req.user as User;
      const potentialMembers = await getPotentialVillageMembers(user.id);
      
      return res.json({
        success: true,
        recommendations: potentialMembers
      });
    } catch (error) {
      console.error("[Village Recommendations] Error:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while getting village recommendations"
      });
    }
  });

  /**
   * Endpoint to add a recommended member to the village
   */
  router.post("/village/recommendations/add", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }
    
    try {
      const user = req.user as User;
      const { name, type, circle, category, contactFrequency } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Member name is required"
        });
      }
      
      // Check if member already exists
      const existingMembers = await db
        .select()
        .from(villageMembers)
        .where(eq(villageMembers.userId, user.id));
      
      if (existingMembers.some(m => m.name.toLowerCase() === name.toLowerCase())) {
        return res.json({
          success: false,
          message: "Deze persoon bestaat al in je Village"
        });
      }
      
      // Create new village member
      const [newMember] = await db
        .insert(villageMembers)
        .values({
          userId: user.id,
          name,
          type: type || 'other',
          circle: circle || 2,
          category: category || null,
          contactFrequency: contactFrequency || null,
          positionAngle: String(Math.random() * 360)
        })
        .returning();
      
      return res.json({
        success: true,
        member: newMember,
        message: `${name} is toegevoegd aan je Village`
      });
    } catch (error) {
      console.error("[Village Recommendations] Error adding member:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while adding the village member"
      });
    }
  });

  return router;
}