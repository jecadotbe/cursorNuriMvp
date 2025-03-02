import { Router } from "express";
import { db } from "@db";
import { villageMembers } from "@db/schema";
import { eq } from "drizzle-orm";
import type { User } from "../../auth";
import { 
  extractVillageMembersFromMessage, 
  addVillageMembersFromChat 
} from "../../services/village-chat-integration";

export function setupVillageChatIntegration(router: Router) {
  /**
   * Endpoint to process village member additions from chat
   * This endpoint analyzes the provided message and extracts potential village members,
   * then adds them to the user's village if they don't already exist.
   */
  router.post("/village/process", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const user = req.user as User;
      const { message } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ 
          success: false, 
          message: "Message is required" 
        });
      }

      // Extract potential village members from the message
      const detectedMembers = extractVillageMembersFromMessage(message);
      
      if (detectedMembers.length === 0) {
        return res.json({ 
          success: true, 
          addedMembers: [], 
          allMembers: [], 
          message: "No village members detected" 
        });
      }

      // Add the detected members to the user's village
      const addedMembers = await addVillageMembersFromChat(user.id, detectedMembers);
      
      // Get all village members for this user (for confirmation message)
      const allMembers = await db
        .select()
        .from(villageMembers)
        .where(eq(villageMembers.userId, user.id));

      return res.json({
        success: true,
        addedMembers,
        allMembers,
        message: `Added ${addedMembers.length} member(s) to village`
      });
    } catch (error) {
      console.error("[Village Chat Integration] Error:", error);
      return res.status(500).json({ 
        success: false, 
        message: "An error occurred while processing village members" 
      });
    }
  });

  return router;
}