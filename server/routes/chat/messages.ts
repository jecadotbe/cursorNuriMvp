import { Router } from "express";
import { db } from "@db";
import { chats, parentProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import { anthropic } from "../../anthropic";
import { memoryService } from "../../services/memory";
import { searchBooks } from "../../rag";
import type { User } from "../../auth";
import { getVillageContext } from "../village";

export function setupChatRoutes(router: Router) {
  // Handle chat messages
  router.post("/", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const user = req.user as User;
      const messages = req.body.messages;
      const lastMessage = messages[messages.length - 1].content;

      // Get recent context by combining last 2 messages if available
      const contextWindow = messages.slice(-3)
        .map(m => m.content)
        .join(" ");

      // Get parent profile for context
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      console.log('[Chat Route] User profile:', profile);

      // Get relevant memories with enhanced logging
      console.log('[Chat Route] Fetching relevant memories for context:', contextWindow);
      const relevantMemories = await memoryService.getRelevantMemories(
        user.id,
        contextWindow,
        'chat' // Specify this is for chat context
      );
      console.log(`[Chat Route] Found ${relevantMemories.length} relevant memories:`, 
        JSON.stringify(relevantMemories, null, 2));

      // Get village context
      console.log('[Chat Route] Fetching village context');
      const villageContextString = await getVillageContext(user.id);

      // Get RAG context
      console.log('[Chat Route] Fetching RAG context');
      const ragContext = await searchBooks(lastMessage, 2);
      const mergedRAG = ragContext.map((doc) => doc.pageContent).join("\n\n");

      // Format profile context
      console.log('[Chat Route] Formatting profile context');
      const profileContext = profile ? `
User Profile:
Name: ${profile.name}
Experience Level: ${profile.experienceLevel}
Stress Level: ${profile.stressLevel}
${profile.onboardingData?.childProfiles ? `
Children:
${profile.onboardingData.childProfiles
  .map((child: any) => `- ${child.name} (${child.age} years old)${child.specialNeeds?.length ? `, Special needs: ${child.specialNeeds.join(", ")}` : ""}`)
  .join("\n")}
` : ""}
Primary Concerns: ${profile.primaryConcerns?.join(", ") || "None specified"}
` : "";

      // Format memories by type
      const onboardingMemories = relevantMemories
        .filter(m => m.metadata?.category === "user_onboarding")
        .map(m => m.content);

      const chatMemories = relevantMemories
        .filter(m => m.metadata?.category === "chat_history")
        .map(m => m.content);

      // Build comprehensive system prompt
      const systemPrompt = `${process.env.NURI_SYSTEM_PROMPT}

Current Context:
${profileContext}

User Background:
${onboardingMemories.length > 0 ? onboardingMemories.join("\n") : "No background information available"}

Village Context:
${villageContextString || "No village context available"}

Recent Chat History:
${chatMemories.length > 0 ? chatMemories.map(m => `- ${m}`).join("\n") : "No relevant chat history available"}

Retrieved Knowledge:
${mergedRAG || "No relevant knowledge base content available"}

Remember to:
1. Use the provided context to personalize responses
2. Reference children by name when relevant (Jeroen and Lynn)
3. Consider family dynamics and support network
4. Address specific concerns from user profile
`;

      console.log('[Chat Route] Final system prompt:', systemPrompt);

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 512,
        temperature: 0.4,
        system: systemPrompt,
        messages: req.body.messages,
      });

      const messageContent =
        response.content[0].type === "text" ? response.content[0].text : "";

      // Store conversation in memory
      try {
        console.log('[Chat Route] Storing user message in memory');
        await memoryService.createMemory(user.id, lastMessage, {
          role: "user",
          messageIndex: req.body.messages.length - 1,
          chatId: req.body.chatId || "new",
          source: "nuri-chat",
          type: "conversation",
          category: "chat_history",
          timestamp: new Date().toISOString(),
        });

        console.log('[Chat Route] Storing assistant response in memory');
        await memoryService.createMemory(user.id, messageContent, {
          role: "assistant",
          messageIndex: req.body.messages.length,
          chatId: req.body.chatId || "new",
          source: "nuri-chat",
          type: "conversation",
          category: "chat_history",
          timestamp: new Date().toISOString(),
        });

      } catch (memoryError) {
        console.error("[Chat Route] Failed to store chat in memory:", memoryError);
      }

      res.json({ content: messageContent });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({
        message: "Failed to process chat message",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  router.get("/:chatId", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const chatId = parseInt(req.params.chatId);
    if (isNaN(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const user = req.user as User;
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat.userId !== user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(chat);
  });

  return router;
}