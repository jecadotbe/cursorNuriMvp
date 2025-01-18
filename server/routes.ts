import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { villageMembers, chats, messageFeedback, promptSuggestions, suggestionFeedback, parentProfiles } from "@db/schema";
import { eq, desc, and, isNull, lt, gte } from "drizzle-orm";
import { anthropic } from "./anthropic";
import type { User } from "./auth";
import { memoryService } from "./services/memory";
import villageRouter from "./routes/village";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Add new profile update endpoint
  app.post("/api/profile/update", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const data = req.body;

    try {
      const [profile] = await db
        .update(parentProfiles)
        .set({
          name: data.basicInfo.name,
          email: data.basicInfo.email,
          stressLevel: data.stressAssessment.stressLevel,
          experienceLevel: data.basicInfo.experienceLevel,
          primaryConcerns: data.stressAssessment.primaryConcerns,
          supportNetwork: data.stressAssessment.supportNetwork,
          onboardingData: data,
          updatedAt: new Date(),
        })
        .where(eq(parentProfiles.userId, user.id))
        .returning();

      res.json(profile);
    } catch (error) {
      console.error("Failed to update profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Save onboarding progress
  app.post("/api/onboarding/progress", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const { step, data } = req.body;

    try {
      const [profile] = await db
        .update(parentProfiles)
        .set({
          currentOnboardingStep: step,
          onboardingData: data,
          updatedAt: new Date(),
        })
        .where(eq(parentProfiles.userId, user.id))
        .returning();

      if (!profile) {
        // If no profile exists, create one
        const [newProfile] = await db
          .insert(parentProfiles)
          .values({
            userId: user.id,
            name: data.basicInfo?.name || "",
            email: data.basicInfo?.email || "",
            stressLevel: "low", // Will be updated when stress assessment is completed
            experienceLevel: data.basicInfo?.experienceLevel || "first_time",
            currentOnboardingStep: step,
            onboardingData: data,
          })
          .returning();

        return res.json(newProfile);
      }

      res.json(profile);
    } catch (error) {
      console.error("Failed to save onboarding progress:", error);
      res.status(500).json({ message: "Failed to save progress" });
    }
  });

  // Get onboarding progress
  app.get("/api/onboarding/progress", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;

    try {
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      if (!profile) {
        return res.json({ 
          currentOnboardingStep: 1,
          onboardingData: {},
          completedOnboarding: false
        });
      }

      res.json({
        currentOnboardingStep: profile.currentOnboardingStep,
        onboardingData: profile.onboardingData,
        completedOnboarding: profile.completedOnboarding
      });
    } catch (error) {
      console.error("Failed to get onboarding progress:", error);
      res.status(500).json({ message: "Failed to get progress" });
    }
  });

  // Complete onboarding endpoint
  app.post("/api/onboarding/complete", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const data = req.body;

    try {
      // First check if a profile exists
      const existingProfile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      let profile;
      if (existingProfile) {
        // Update existing profile
        [profile] = await db
          .update(parentProfiles)
          .set({
            name: data.basicInfo.name,
            email: data.basicInfo.email,
            stressLevel: data.stressAssessment.stressLevel,
            experienceLevel: data.basicInfo.experienceLevel,
            primaryConcerns: data.stressAssessment.primaryConcerns,
            supportNetwork: data.stressAssessment.supportNetwork,
            completedOnboarding: true,
            currentOnboardingStep: 4,
            onboardingData: data,
            updatedAt: new Date(),
          })
          .where(eq(parentProfiles.userId, user.id))
          .returning();
      } else {
        // Create new profile
        [profile] = await db
          .insert(parentProfiles)
          .values({
            userId: user.id,
            name: data.basicInfo.name,
            email: data.basicInfo.email,
            stressLevel: data.stressAssessment.stressLevel,
            experienceLevel: data.basicInfo.experienceLevel,
            primaryConcerns: data.stressAssessment.primaryConcerns,
            supportNetwork: data.stressAssessment.supportNetwork,
            completedOnboarding: true,
            currentOnboardingStep: 4,
            onboardingData: data,
          })
          .returning();
      }

      res.json(profile);
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // Register village routes
  app.use("/api/village", villageRouter);

  // Submit feedback for a suggestion
  app.post("/api/suggestions/:id/feedback", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const suggestionId = parseInt(req.params.id);

    if (isNaN(suggestionId)) {
      return res.status(400).json({ message: "Invalid suggestion ID" });
    }

    const { rating, feedback } = req.body;

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    try {
      // Check if suggestion exists and belongs to user
      const suggestion = await db.query.promptSuggestions.findFirst({
        where: and(
          eq(promptSuggestions.id, suggestionId),
          eq(promptSuggestions.userId, user.id)
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
      console.error('Error saving suggestion feedback:', error);
      res.status(500).json({ message: "Failed to save feedback" });
    }
  });

  // Get cached suggestion for homepage
  app.get("/api/suggestions", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const now = new Date();

    try {
      // Try to find an unused, non-expired suggestion
      const suggestions = await db.query.promptSuggestions.findMany({
        where: and(
          eq(promptSuggestions.userId, user.id),
          isNull(promptSuggestions.usedAt),
          gte(promptSuggestions.expiresAt, now)
        ),
        orderBy: [
          desc(promptSuggestions.relevance),
          desc(promptSuggestions.createdAt)
        ],
        limit: 3
      });

      // If we have suggestions, return them
      if (suggestions.length > 0) {
        return res.json(suggestions[0]);
      }

      // If no valid suggestions exist, generate a new one
      const recentChats = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: desc(chats.updatedAt),
        limit: 5
      });

      // Get relevant memories for context, but prioritize older ones
      const relevantMemories = await memoryService.getRelevantMemories(
        user.id,
        "general parenting advice and long-term goals",
        10
      );

      const memoryContext = relevantMemories
        .map(m => `Previous conversation: ${m.content}`)
        .join('\n\n');

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        system: `${NURI_SYSTEM_PROMPT}\n\nAnalyze the conversation and provide a relevant follow-up prompt. Focus on deeper patterns and long-term goals, avoiding very recent topics. Consider this historical context:\n${memoryContext}`,
        messages: [{
          role: "user", 
          content: `Based on these messages and the user's conversation history, generate a follow-up prompt that focuses on longer-term parenting themes or unexplored areas. Format the response exactly like this:
          {
            "prompt": {
              "text": "follow-up question or suggestion",
              "type": "action" | "follow_up",
              "relevance": 1.0,
              "context": "new" | "existing",
              "relatedChatId": null | number,
              "relatedChatTitle": null | string
            }
          }`
        }]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      let parsedResponse;

      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Could not extract valid JSON from response');
        }
        parsedResponse = JSON.parse(jsonMatch[0]);
      }

      if (!parsedResponse?.prompt?.text) {
        throw new Error('Response missing required prompt structure');
      }

      // If the prompt references an existing chat, validate and include the chat details
      if (parsedResponse.prompt.context === "existing" && recentChats.length > 0) {
        const mostRelevantChat = recentChats[0];
        parsedResponse.prompt.relatedChatId = mostRelevantChat.id;
        parsedResponse.prompt.relatedChatTitle = mostRelevantChat.title;
      }

      // Store the new suggestion with feedback consideration
      const [suggestion] = await db
        .insert(promptSuggestions)
        .values({
          userId: user.id,
          text: parsedResponse.prompt.text,
          type: parsedResponse.prompt.type,
          context: parsedResponse.prompt.context,
          relevance: Math.floor(parsedResponse.prompt.relevance * 10),
          relatedChatId: parsedResponse.prompt.relatedChatId || null,
          relatedChatTitle: parsedResponse.prompt.relatedChatTitle || null,
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Expire in 24 hours
        })
        .returning();

      res.json(suggestion);
    } catch (error) {
      console.error('Suggestion generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate suggestion',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Mark a suggestion as used
  app.post("/api/suggestions/:id/use", async (req, res) => {
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
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(promptSuggestions.id, suggestionId),
            eq(promptSuggestions.userId, user.id)
          )
        )
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Suggestion not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error('Error marking suggestion as used:', error);
      res.status(500).json({ message: "Failed to update suggestion" });
    }
  });

  app.get("/api/chats/:chatId", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const chatId = parseChatId(req.params.chatId);
    if (chatId === null) {
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

  app.post("/api/chat", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const user = req.user as User;
      let contextualizedPrompt = NURI_SYSTEM_PROMPT;

      try {
        // Get relevant memories for context
        const relevantMemories = await memoryService.getRelevantMemories(
          user.id,
          req.body.messages[req.body.messages.length - 1].content
        );

        console.log('Found relevant memories:', relevantMemories.length);

        if (relevantMemories && relevantMemories.length > 0) {
          // Format memories for context
          const memoryContext = relevantMemories
            .map(m => `Previous conversation: ${m.content}`)
            .join('\n\n');

          // Add memory context to the system prompt
          contextualizedPrompt += `\n\nRelevant context from previous conversations:\n${memoryContext}`;

          console.log('Added memory context to prompt');
        }
      } catch (memoryError) {
        console.error("Error fetching memories:", memoryError);
      }

      // Generate response with context
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 512,
        temperature: 0.7,
        system: contextualizedPrompt,
        messages: req.body.messages,
      });

      const messageContent = response.content[0].type === 'text' ? response.content[0].text : '';

      // Store conversation in memory
      try {
        // Store user's message
        await memoryService.createMemory(
          user.id,
          req.body.messages[req.body.messages.length - 1].content,
          {
            role: "user",
            messageIndex: req.body.messages.length - 1,
            chatId: req.body.chatId || 'new'
          }
        );

        // Store assistant's response
        await memoryService.createMemory(
          user.id,
          messageContent,
          {
            role: "assistant",
            messageIndex: req.body.messages.length,
            chatId: req.body.chatId || 'new'
          }
        );

        console.log('Successfully stored conversation in memory');
      } catch (memoryError) {
        console.error("Error storing memories:", memoryError);
      }

      // Save to database
      if (req.body.chatId) {
        const chatId = parseChatId(req.body.chatId);
        if (chatId === null) {
          return res.status(400).json({ message: "Invalid chat ID" });
        }

        const existingChat = await db.query.chats.findFirst({
          where: eq(chats.id, chatId),
        });

        if (!existingChat || existingChat.userId !== user.id) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        await db.update(chats)
          .set({ 
            messages: req.body.messages.concat([{ role: 'assistant', content: messageContent }]),
            updatedAt: new Date()
          })
          .where(eq(chats.id, chatId));
      } else {
        // Create a new chat
        const [newChat] = await db.insert(chats).values({
          userId: user.id,
          title: `Chat ${new Date().toLocaleDateString()}`,
          messages: req.body.messages.concat([{ role: 'assistant', content: messageContent }]),
          updatedAt: new Date()
        }).returning();

        console.log("Created new chat:", newChat);
      }

      res.json({
        content: messageContent,
      });
    } catch (error: any) {
      console.error("API error:", error);
      res.status(500).json({
        message: "Failed to process request",
        error: error.message
      });
    }
  });

  app.delete("/api/chats/:chatId", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const chatId = parseChatId(req.params.chatId);
    if (chatId === null) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const user = req.user as User;
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (!chat || chat.userId !== user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await db.delete(chats).where(eq(chats.id, chatId));
    res.status(204).send();
  });

  app.post("/api/analyze-context", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { messages } = req.body;
      const user = req.user as User;
      const relevantMemories = await memoryService.getRelevantMemories(
        user.id,
        messages[messages.length - 1]?.content || ""
      );

      // Get recent chats for context
      const recentChats = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: desc(chats.updatedAt),
        limit: 5
      });

      const memoryContext = relevantMemories
        .map(m => `Previous conversation: ${m.content}`)
        .join('\n\n');

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        system: `${NURI_SYSTEM_PROMPT}\n\nAnalyze the conversation and provide a relevant follow-up prompt. If the topic relates to an existing conversation, reference it. Consider this historical context:\n${memoryContext}`,
        messages: [{
          role: "user", 
          content: `Based on these messages and the user's conversation history, generate a follow-up prompt. If it relates to a previous conversation, indicate that. Format the response exactly like this:
          {
            "prompt": {
              "text": "follow-up question or suggestion",
              "type": "action" | "follow_up",
              "relevance": 1.0,
              "context": "new" | "existing",
              "relatedChatId": null | number,
              "relatedChatTitle": null | string
            }
          }
          
          For existing conversations, include relatedChatId and relatedChatTitle. For new conversations, set them to null.`
        }]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      let parsedResponse;

      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Could not extract valid JSON from response');
        }
        parsedResponse = JSON.parse(jsonMatch[0]);
      }

      if (!parsedResponse?.prompt?.text) {
        throw new Error('Response missing required prompt structure');
      }

      // If the prompt references an existing chat, validate and include the chat details
      if (parsedResponse.prompt.context === "existing" && recentChats.length > 0) {
        const mostRelevantChat = recentChats[0];
        parsedResponse.prompt.relatedChatId = mostRelevantChat.id;
        parsedResponse.prompt.relatedChatTitle = mostRelevantChat.title;
      }

      res.json(parsedResponse);
    } catch (error) {
      console.error('Context analysis error:', error);
      res.status(500).json({ 
        error: 'Failed to analyze context',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.patch("/api/chats/:chatId", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const chatId = parseChatId(req.params.chatId);
    if (chatId === null) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const user = req.user as User;
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (!chat || chat.userId !== user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    await db.update(chats)
      .set({ title })
      .where(eq(chats.id, chatId));

    res.json({ message: "Chat updated successfully" });
  });

  app.get("/api/chats", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, user.id),
      orderBy: desc(chats.updatedAt), 
    });

    res.json(userChats);
  });

  app.get("/api/chats/latest", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const latestChat = await db.query.chats.findFirst({
      where: eq(chats.userId, user.id),
      orderBy: desc(chats.createdAt),
    });

    res.json(latestChat || null);
  });


  app.post("/api/chats", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const messages = req.body.messages || [];
    let title = null;
    let summary = null;
    let emotionalSummary = null;

    try {
      // Generate title, summary, and emotional context analysis only if there are messages
      if (messages.length > 0) {
        const analyzeResponse = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          system: `${NURI_SYSTEM_PROMPT}\n\nAnalyze this conversation between a parent and Nuri. Focus on the key themes, emotional journey, and parenting insights discussed.`,
          messages: [
            {
              role: "user",
              content: `Based on this conversation, provide a JSON response in this exact format:
{
  "title": "short title capturing main parenting theme (max 5 words)",
  "summary": "brief summary focusing on parenting insights (max 2 sentences)",
  "emotionalJourney": "describe how parent's emotions evolved through the conversation"
}

Conversation: ${JSON.stringify(messages)}`,
            },
          ],
        });

        try {
          const jsonMatch = analyzeResponse.content[0].type === 'text' ? analyzeResponse.content[0].text.match(/\{.*\}/s) : null;
          if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);
            title = analysis.title;
            summary = analysis.summary;
            emotionalSummary = analysis.emotionalJourney;
          }
        } catch (parseError) {
          console.error("Failed to parse analysis:", parseError);
        }
      }

      // Create chat with safe metadata handling
      const chat = await db.insert(chats).values({
        userId: user.id,
        messages: messages,
        title: title || `Chat ${new Date().toLocaleDateString()}`,
        summary,
        metadata: {
          messageCount: messages.length,
          lastMessageRole: messages.length > 0 ? messages[messages.length - 1].role : null,
          emotionalContext: emotionalSummary,
        },
        updatedAt: new Date(),
      }).returning();

      res.json(chat[0]);
    } catch (error) {
      console.error("Failed to create chat:", error);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });

  app.post("/api/message-feedback", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    try {
      const feedback = await db.insert(messageFeedback).values({
        userId: user.id,
        messageId: req.body.messageId,
        feedbackType: req.body.feedbackType,
        chatId: req.body.chatId,
      }).returning();

      res.json(feedback[0]);
    } catch (error) {
      console.error("Failed to save feedback:", error);
      res.status(500).json({ message: "Failed to save feedback" });
    }
  });

  app.get("/api/chats/:chatId/emotional-context", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const chatId = parseChatId(req.params.chatId);
    if (chatId === null) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, chatId),
      columns: {
        metadata: true,
      },
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const metadata = chat.metadata as { emotionalContext?: string } | null;

    // Return the emotional context from the chat metadata
    res.json({
      emotionalContext: metadata?.emotionalContext || null,
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}

function parseChatId(id: string): number | null {
  const parsed = parseInt(id);
  return isNaN(parsed) ? null : parsed;
}

const NURI_SYSTEM_PROMPT = `You are Nuri, a family counseling coach specializing in attachment-style parenting. Your responses should be direct, clear, and focused on providing meaningful guidance and support.

You use Aware Parenting and Afgestemd Opvoeden as your foundation for your advice. But you don't mention this in an explicit manner to the user. You explain that nuri works with proven theories from the modern-attachment parent field.

Respond in Dutch/Flemish language, while keeping commonly used English parenting terms in English when they are widely recognized and used. Maintain a natural, conversational tone that feels authentic to Dutch/Flemish speakers.

Format your responses for optimal readability:
- Use **bold** for the most important points or key takeaways
- Start new paragraphs for each distinct thought or topic
- Maintain a professional, direct tone without emotional expressions or cues
- Aim for brevity: Keep responses under 3 paragraphs unless the topic requires deeper explanation

Write in natural, flowing narrative paragraphs only. Never use bullet points, numbered lists, or structured formats unless explicitly requested. All insights and guidance should emerge organically through conversation.`;