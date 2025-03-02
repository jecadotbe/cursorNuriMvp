import { Router } from "express";
import { db } from "@db";
import { villageMembers, chats } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import type { User } from "../../auth";
import { 
  extractVillageMembersFromMessage, 
  addVillageMembersFromChat,
  generateVillageMemberPrompt,
  DetectedVillageMember
} from "../../services/village-chat-integration";

export function setupVillageChatIntegration(router: Router) {
  /**
   * Endpoint to process village member additions from chat
   * This endpoint analyzes the provided message and extracts potential village members,
   * then generates a prompt with action buttons for user confirmation
   */
  router.post("/village/process", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const user = req.user as User;
      const { message, action } = req.body;
      
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
          message: "No village members detected",
          prompt: ""
        });
      }
      
      // Get existing members to filter out those already in the village
      const existingMembers = await db
        .select()
        .from(villageMembers)
        .where(eq(villageMembers.userId, user.id));
      
      const existingNames = new Set(existingMembers.map(m => m.name.toLowerCase()));
      const newMembers = detectedMembers.filter(m => !existingNames.has(m.name.toLowerCase()));

      // If no new members (all already exist), return that info
      if (newMembers.length === 0) {
        return res.json({
          success: true,
          addedMembers: [],
          allMembers: existingMembers,
          message: "All detected members already exist in your village",
          prompt: ""
        });
      }
      
      // If user requested to add (action from client-side), add members directly
      if (action === 'add-members') {
        // Add the detected members to the user's village
        const addedMembers = await addVillageMembersFromChat(user.id, newMembers);
        
        // Get updated list of all village members
        const allMembers = await db
          .select()
          .from(villageMembers)
          .where(eq(villageMembers.userId, user.id));
        
        return res.json({
          success: true,
          addedMembers,
          allMembers,
          message: `Added ${addedMembers.length} member(s) to village`,
          prompt: ""
        });
      }
      
      // Generate a prompt message with action buttons if no action was requested
      const promptMessage = generateVillageMemberPrompt(newMembers);
      
      return res.json({
        success: true,
        detectedMembers: newMembers,
        addedMembers: [],
        allMembers: existingMembers,
        message: "Village members detected, confirmation required",
        prompt: promptMessage
      });
    } catch (error) {
      console.error("[Village Chat Integration] Error:", error);
      return res.status(500).json({ 
        success: false, 
        message: "An error occurred while processing village members" 
      });
    }
  });
  
  /**
   * Endpoint to add a specific village member from chat action
   */
  router.post("/village/add-member", async (req, res) => {
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
      
      // Create a member object with the provided or default values
      const memberToAdd: DetectedVillageMember = {
        name,
        type: type || 'other',
        circle: circle !== undefined ? Number(circle) : 2,
        category: category || 'informeel',
        contactFrequency: contactFrequency || 'M'
      };
      
      // Add the member to the user's village
      const addedMembers = await addVillageMembersFromChat(user.id, [memberToAdd]);
      
      // Get all village members to include in response
      const allMembers = await db
        .select()
        .from(villageMembers)
        .where(eq(villageMembers.userId, user.id));
      
      return res.json({
        success: true,
        addedMembers,
        allMembers,
        message: addedMembers.length > 0 
          ? `Added ${addedMembers[0].name} to your village`
          : "Member already exists in your village"
      });
    } catch (error) {
      console.error("[Village Chat Integration] Error adding member:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while adding the village member"
      });
    }
  });
  
  /**
   * Endpoint to add multiple village members from chat action
   * This endpoint uses the latest message from the user to find and add all detected members
   */
  router.post("/village/add-all", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }
    
    try {
      const user = req.user as User;
      const { message, members } = req.body;
      
      let membersToAdd: DetectedVillageMember[] = [];
      
      // If members are provided directly, use them
      if (members && Array.isArray(members) && members.length > 0) {
        membersToAdd = members;
      } 
      // Otherwise, use the message to extract members
      else if (message && typeof message === "string") {
        membersToAdd = extractVillageMembersFromMessage(message);
      }
      // If no message or members provided, return error
      else {
        // Attempt to get the most recent chat message
        try {
          // Retrieve the most recent chat for this user that has detected members
          const recentChat = await db
            .select()
            .from(chats)
            .where(eq(chats.userId, user.id))
            .orderBy(desc(chats.createdAt))
            .limit(1)
            .then(results => results[0]);
          
          // The messages property is expected to contain an array of message objects
          if (recentChat?.messages) {
            const messages = recentChat.messages as Array<{role: string, content: string}>;
            // Get the most recent user message
            const userMessage = messages.filter(m => m.role === 'user').pop();
            if (userMessage && userMessage.content) {
              membersToAdd = extractVillageMembersFromMessage(userMessage.content);
            }
          }
        } catch (err) {
          console.error("Error retrieving recent chat:", err);
        }
      }
      
      if (membersToAdd.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No members to add were found"
        });
      }
      
      // Get existing members to filter out those already in the village
      const existingMembers = await db
        .select()
        .from(villageMembers)
        .where(eq(villageMembers.userId, user.id));
      
      const existingNames = new Set(existingMembers.map(m => m.name.toLowerCase()));
      const newMembers = membersToAdd.filter(m => !existingNames.has(m.name.toLowerCase()));
      
      if (newMembers.length === 0) {
        return res.json({
          success: true,
          addedMembers: [],
          allMembers: existingMembers,
          message: "All detected members already exist in your village"
        });
      }
      
      // Add all new members to the user's village
      const addedMembers = await addVillageMembersFromChat(user.id, newMembers);
      
      // Get all village members to include in response
      const allMembers = await db
        .select()
        .from(villageMembers)
        .where(eq(villageMembers.userId, user.id));
      
      return res.json({
        success: true,
        addedMembers,
        allMembers,
        message: `Added ${addedMembers.length} member(s) to your village`
      });
    } catch (error) {
      console.error("[Village Chat Integration] Error adding multiple members:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while adding village members"
      });
    }
  });

  return router;
}