import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import {
  villageMembers,
  villageMemberMemories,
  villageInsights,
  villageMemberInteractions,
  chats,
  messageFeedback,
  promptSuggestions,
  suggestionFeedback,
  parentProfiles,
} from "@db/schema";
import { eq, desc, and, isNull, lt, gte, sql } from "drizzle-orm";
import { anthropic } from "./anthropic";
import type { User } from "./auth";
import { memoryService } from "./services/memory";
import villageRouter from "./routes/village";
import {format} from 'date-fns'
import { and, eq, desc } from "drizzle-orm";
import { db } from "@db";
import { villageMembers, villageMemberMemories } from "@db/schema";

const getVillageContext = async (userId: number) => {
  try {
    // Get village members with their recent memories
    const members = await db
      .select({
        id: villageMembers.id,
        name: villageMembers.name,
        type: villageMembers.type,
        role: villageMembers.role,
        category: villageMembers.category,
      })
      .from(villageMembers)
      .where(eq(villageMembers.userId, userId));

    if (!members || members.length === 0) {
      return null;
    }

    // Get memories for each member
    const membersWithMemories = await Promise.all(
      members.map(async (member) => {
        const memories = await db
          .select({
            title: villageMemberMemories.title,
            content: villageMemberMemories.content,
            date: villageMemberMemories.date,
          })
          .from(villageMemberMemories)
          .where(
            and(
              eq(villageMemberMemories.villageMemberId, member.id),
              eq(villageMemberMemories.userId, userId)
            )
          )
          .orderBy(desc(villageMemberMemories.date))
          .limit(3);

        return {
          ...member,
          memories,
        };
      })
    );

    // Format context string with all available information
    const contextString = membersWithMemories
      .map(
        (member) => `
Member: ${member.name}
Role: ${member.role || 'Not specified'}
Type: ${member.type}
Category: ${member.category || 'Not specified'}
Recent memories: ${
          member.memories.length > 0
            ? member.memories
                .map(
                  (memory) =>
                    `\n  - ${format(new Date(memory.date), 'MM/dd/yyyy')}: ${
                      memory.title
                    } - ${memory.content.substring(0, 100)}...`
                )
                .join('')
            : '\n  No recent memories'
        }`
      )
      .join('\n\n');

    return `\n\nVillage Context:\nYour support network includes the following members:\n${contextString}`;
  } catch (error) {
    console.error('Error getting village context:', error);
    return '';
  }
};

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
          completedOnboarding: false,
        });
      }

      res.json({
        currentOnboardingStep: profile.currentOnboardingStep,
        onboardingData: profile.onboardingData,
        completedOnboarding: profile.completedOnboarding,
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

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
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
          gte(promptSuggestions.expiresAt, now),
        ),
        orderBy: [
          desc(promptSuggestions.relevance),
          desc(promptSuggestions.createdAt),
        ],
        limit: 3,
      });

      // If we have suggestions, return them
      if (suggestions.length > 0) {
        return res.json(suggestions[0]);
      }

      // Get user's profile data for personalized suggestions
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      // Get recent chats for context
      const recentChats = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: desc(chats.updatedAt),
        limit: 5,
      });

      // Get relevant memories for context, but prioritize older ones
      const relevantMemories = await memoryService.getRelevantMemories(
        user.id,
        "general parenting advice and long-term goals",
        10,
      );

      const memoryContext = relevantMemories
        .map((m) => `Previous conversation: ${m.content}`)
        .join("\n\n");

      // Build personalized context from onboarding data
      let personalizedContext = "";
      if (profile?.onboardingData) {
        personalizedContext = `
Parent's Profile:
- Experience Level: ${profile.onboardingData.basicInfo?.experienceLevel}
- Stress Level: ${profile.onboardingData.stressAssessment?.stressLevel}
- Primary Concerns: ${profile.onboardingData.stressAssessment?.primaryConcerns?.join(", ")}
${profile.onboardingData.childProfiles
          ?.map(
            (child) =>
              `Child: ${child.name}, Age: ${child.age}${child.specialNeeds?.length ? `, Special needs: ${child.specialNeeds.join(", ")}` : ""}`,
          )
          .join("\n")}

Goals:
${profile.onboardingData.goals?.shortTerm?.length ? `- Short term goals: ${profile.onboardingData.goals.shortTerm.join(", ")}` : ""}
${profile.onboardingData.goals?.longTerm?.length ? `- Long term goals: ${profile.onboardingData.goals.longTerm.join(", ")}` : ""}
`;
      }

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        system: `${NURI_SYSTEM_PROMPT}

${personalizedContext ? `Consider this parent's profile and context when generating suggestions:\n${personalizedContext}\n` : ""}
${memoryContext ? `Previous conversations for context:\n${memoryContext}` : ""}

Analyze the available context and provide a relevant suggestion. For new users or those with limited chat history, focus on their onboarding information to provide personalized suggestions.`,
        messages: [
          {
            role: "user",
            content: `Based on the parent's profile and any conversation history, generate a follow-up prompt that focuses on their specific needs and goals. Format the response exactly like this:
          {
            "prompt": {
              "text": "follow-up question or suggestion",
              "type": "action" | "follow_up",
              "relevance": 1.0,
              "context": "new" | "existing",
              "relatedChatId": null | number,
              "relatedChatTitle": null | string
            }
          }`,
          },
        ],
      });

      const responseText =
        response.content[0].type === "text" ? response.content[0].text : "";
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

      // If the prompt references an existing chat, validate and include the chat details
      if (
        parsedResponse.prompt.context === "existing" &&
        recentChats.length > 0
      ) {
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
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Expire in 24 hours
        })
        .returning();

      res.json(suggestion);
    } catch (error) {
      console.error("Suggestion generation error:", error);
      res.status(500).json({
        error: "Failed to generate suggestion",
        details: error instanceof Error ? error.message : "Unknown error",
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
        // Get user's profile data for context
        const profile = await db.query.parentProfiles.findFirst({
          where: eq(parentProfiles.userId, user.id),
        });

        // Add village context to the prompt
        const villageContextString = await getVillageContext(user.id);
        if (villageContextString) {
          contextualizedPrompt += villageContextString;
        }

        // Add profile context if available
        if (profile?.onboardingData) {
          const profileContext = `
Parent's Context:
- Experience Level: ${profile.onboardingData.basicInfo?.experienceLevel}
- Stress Level: ${profile.onboardingData.stressAssessment?.stressLevel}
- Primary Concerns: ${profile.onboardingData.stressAssessment?.primaryConcerns?.join(", ")}
${profile.onboardingData.childProfiles
            ?.map(
              (child) =>
                `Child: ${child.name}, Age: ${child.age}${child.specialNeeds?.length ? `, Special needs: ${child.specialNeeds.join(", ")}` : ""}`,
            )
            .join("\n")}`;
          contextualizedPrompt += `\n\n${profileContext}`;
        }


        // Get relevant memories for context
        const relevantMemories = await memoryService.getRelevantMemories(
          user.id,
          req.body.messages[req.body.messages.length - 1].content,
        );

        console.log("Found relevant memories:", relevantMemories.length);

        if (relevantMemories && relevantMemories.length > 0) {
          // Format memories for context
          const memoryContext = relevantMemories
            .map((m) => `Previous conversation: ${m.content}`)
            .join("\n\n");

          // Add memory context to the system prompt
          contextualizedPrompt += `\n\nRelevant context from previous conversations:\n${memoryContext}`;

          console.log("Added memory context to prompt");
        }
      } catch (memoryError) {
        console.error("Error fetching memories or profile:", memoryError);
      }

      // Generate response with context
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 512,
        temperature: 0.7,
        system: contextualizedPrompt,
        messages: req.body.messages,
      });

      const messageContent =
        response.content[0].type === "text" ? response.content[0].text : "";

      // Store conversation in memory
      try {
        // Store user's message
        await memoryService.createMemory(
          user.id,
          req.body.messages[req.body.messages.length - 1].content,
          {
            role: "user",
            messageIndex: req.body.messages.length - 1,
            chatId: req.body.chatId || "new",
          },
        );

        // Store assistant's response
        await memoryService.createMemory(user.id, messageContent, {
          role: "assistant",
          messageIndex: req.body.messages.length,
          chatId: req.body.chatId || "new",
        });

        console.log("Successfully stored conversation in memory");
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

        await db
          .update(chats)
          .set({
            messages: req.body.messages.concat([
              { role: "assistant", content: messageContent },
            ]),
            updatedAt: new Date(),
          })
          .where(eq(chats.id, chatId));
      } else {
        // Create a new chat
        const [newChat] = await db
          .insert(chats)
          .values({
            userId: user.id,
            title: `Chat ${new Date().toLocaleDateString()}`,
            messages: req.body.messages.concat([
              { role: "assistant", content: messageContent },
            ]),
            updatedAt: new Date(),
          })
          .returning();

        console.log("Created new chat:", newChat);
      }

      res.json({
        content: messageContent,
      });
    } catch (error: any) {
      console.error("API error:", error);
      res.status(500).json({
        message: "Failed to process request",
        error: error.message,
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
        messages[messages.length - 1]?.content || "",
      );

      // Get recent chats for context
      const recentChats = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: desc(chats.updatedAt),
        limit: 5,
      });

      const memoryContext = relevantMemories
        .map((m) => `Previous conversation: ${m.content}`)
        .join("\n\n");

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        system: `${NURI_SYSTEM_PROMPT}\n\nAnalyze the conversation and provide a relevant follow-up prompt. If the topic relates to an existing conversation, reference it. Consider this historical context:\n${memoryContext}`,
        messages: [
          {
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

          For existing conversations, include relatedChatId and relatedChatTitle. For new conversations, set them to null.`,
          },
        ],
      });

      const responseText =
        response.content[0].type === "text" ? response.content[0].text : "";
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

      // If the prompt references an existing chat, validate and include the chat details
      if (
        parsedResponse.prompt.context === "existing" &&
        recentChats.length > 0
      ) {
        const mostRelevantChat = recentChats[0];
        parsedResponse.prompt.relatedChatId = mostRelevantChat.id;
        parsedResponse.prompt.relatedChatTitle = mostRelevantChat.title;
      }

      res.json(parsedResponse);
    } catch (error) {
      console.error("Context analysis error:", error);
      res.status(500).json({
        error: "Failed to analyze context",
        details: error instanceof Error ? error.message : "Unknown error",
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

    await db.update(chats).set({ title }).where(eq(chats.id, chatId));

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
          const jsonMatch =
            analyzeResponse.content[0].type === "text"
              ? analyzeResponse.content[0].text.match(/\{.*\}/s)
              : null;
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
      const chat = await db
        .insert(chats)
        .values({
          userId: user.id,
          messages: messages,
          title: title || `Chat ${new Date().toLocaleDateString()}`,
          summary,
          metadata: {
            messageCount: messages.length,
            lastMessageRole:
              messages.length > 0 ? messages[messages.length - 1].role : null,
            emotionalContext: emotionalSummary,
          },
          updatedAt: new Date(),
        })
        .returning();

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
      const feedback = await db
        .insert(messageFeedback)
        .values({
          userId: user.id,
          messageId: req.body.messageId,
          feedbackType: req.body.feedbackType,
          chatId: req.body.chatId,
        })
        .returning();

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

  app.post("/api/suggestions/generate", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Notauthenticated");
    }    const user = req.user as User;
    const { chatId, lastMessageContent } = req.body;

    try {
      // Get recent chats for context
      const recentChats = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: desc(chats.updatedAt),
        limit: 5,
      });

      // Get relevant memories for context
      const relevantMemories = await memoryService.getRelevantMemories(
        user.id,
        lastMessageContent,
        5,
      );

      const memoryContext = relevantMemories
        .map((m) => `Previous conversation: ${m.content}`)
        .join("\n\n");

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        system: `${NURI_SYSTEM_PROMPT}\n\nAnalyze the conversation and provide relevant follow-up prompts. Consider this context:\n${memoryContext}`,
        messages: [
          {
            role: "user",
            content:`Based onthis message and conversation history, generate 3-5 natural follow-up prompts that would help continue the conversation naturally. These should be phrased as things a parent might say or ask.
Last message: "${lastMessageContent}"

Format the response as a JSON array of strings, like this:
["prompt 1", "prompt 2", "prompt 3"]

Make the prompts feel natural and conversational in Dutch, as if the parent is speaking.`,
          },
        ],
      });

      const responseText =
        response.content[0].type === "text" ? response.content[0].text : "";
      let suggestions = [];

      try {
        // Try to parse the response as JSON directly
        suggestions = JSON.parse(responseText);
      } catch (parseError) {
        // If direct parsing fails, try to extract JSON array from the response
        const match = responseText.match(/\[[\s\S]*\]/);
        if (match) {
          suggestions = JSON.parse(match[0]);
        } else {
          throw new Error("Could not extract valid suggestions from response");
        }
      }

      if (!Array.isArray(suggestions)) {
        throw new Error("Response is not an array of suggestions");
      }

      res.json({ suggestions });
    } catch (error) {
      console.error("Error generating suggestions:", error);
      res.status(500).json({
        error: "Failed to generate suggestions",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Village member memories endpoints
  app.get("/api/village/members/:memberId/memories", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const memberId = parseInt(req.params.memberId);

    try {
      const memories = await db.query.villageMemberMemories.findMany({
        where: and(
          eq(villageMemberMemories.userId, user.id),
          eq(villageMemberMemories.villageMemberId, memberId)
        ),
        orderBy: desc(villageMemberMemories.date)
      });

      res.json(memories);
    } catch (error) {
      console.error("Failed to fetch memories:", error);
      res.status(500).json({ message: "Failed to fetch memories" });
    }
  });

  app.post("/api/village/members/:memberId/memories", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const memberId = parseInt(req.params.memberId);

    if (isNaN(memberId)) {
      return res.status(400).json({ message: "Invalid member ID" });
    }

    const { title, content, date, emotionalImpact, tags } = req.body;

    try {
      // First verify that the village member belongs to the user
      const member = await db.query.villageMembers.findFirst({
        where: and(
          eq(villageMembers.id, memberId),
          eq(villageMembers.userId, user.id)
        ),
      });

      if (!member) {
        return res.status(404).json({ message: "Village member not found" });
      }

      // Create new memory
      const [memory] = await db
        .insert(villageMemberMemories)
        .values({
          villageMemberId: memberId,
          userId: user.id,
          title,
          content,
          date: new Date(date),
          emotionalImpact,
          tags,
          metadata: {},
        })
        .returning();

      res.json(memory);
    } catch (error) {
      console.error("Failed to create memory:", error);
      res.status(500).json({ message: "Failed to create memory" });
    }
  });

  // Village insights endpoints
  app.get("/api/village/insights", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;

    try {
      const insights = await db.query.villageInsights.findMany({
        where: eq(villageInsights.userId, user.id),
        orderBy: [desc(villageInsights.priority), desc(villageInsights.createdAt)]
      });

      res.json(insights);
    } catch (error) {
      console.error("Failed to fetch insights:", error);
      res.status(500).json({ message: "Failed to fetch insights" });
    }
  });

  app.post("/api/village/insights/generate", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;

    try {
      // Fetch all village members
      const members = await db.query.villageMembers.findMany({
        where: eq(villageMembers.userId, user.id)
      });

      // Fetch recent interactions
      const interactions = await db.query.villageMemberInteractions.findMany({
        where: eq(villageMemberInteractions.userId, user.id),
        orderBy: desc(villageMemberInteractions.date),
        limit: 50
      });

      // Build context for AI analysis
      const networkContext = {
        members: members.map(m => ({
          name: m.name,
          type: m.type,
          circle: m.circle,
          category: m.category,
          contactFrequency: m.contactFrequency
        })),
        recentInteractions: interactions.map(i => ({
          memberId: i.villageMemberId,
          type: i.type,
          date: i.date,
          quality: i.quality
        }))
      };

      // Generate insights using Anthropic
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: `You are analyzing a support network ("village") for a parent. Generate insights about network health, gaps, and opportunities for improvement.
                Consider:
                - Connection strength based on interaction frequency and quality
                - Network gaps in different support categories
                - Opportunities to strengthen relationships
                - Suggestions for better network utilization

                Format as a JSON array of insights, each with:
                {
                  "type": "connection_strength" | "network_gap" | "interaction_suggestion" | "relationship_health",
                  "title": "brief title",
                  "description": "detailed insight",
                  "suggestedAction": "specific action to take (optional)",
                  "priority": 1-5 (higher = more important),
                  "relatedMemberIds": [member IDs] or null
                }`,
        messages: [{
          role: "user",
          content: `Generate insights for this support network: ${JSON.stringify(networkContext)}`
        }]
      });

      const responseText = response.content[0].type === "text" ? response.content[0].text : "";
      let insights;

      try {
        insights = JSON.parse(responseText);
      } catch (parseError) {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error("Could not extract valid JSON from response");
        }
        insights = JSON.parse(jsonMatch[0]);
      }

      // Save generated insights
      const savedInsights = await db
        .insert(villageInsights)
        .values(
          insights.map((insight: any) => ({
            userId: user.id,
            type: insight.type,
            title: insight.title,
            description: insight.description,
            suggestedAction: insight.suggestedAction || null,
            priority: insight.priority,
            relatedMemberIds: insight.relatedMemberIds || null,
            status: "active"
          }))
        )
        .returning();

      res.json(savedInsights);
    } catch (error) {
      console.error("Failed to generate insights:", error);
      res.status(500).json({
        error: "Failed to generate insights",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Village member interactions endpoints
  app.post("/api/village/members/:memberId/interactions", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const memberId = parseInt(req.params.memberId);
    const { type, date, duration, quality, notes } = req.body;

    try {
      const [interaction] = await db
        .insert(villageMemberInteractions)
        .values({
          villageMemberId: memberId,
          userId: user.id,
          type,
          date: new Date(date),
          duration,
          quality,
          notes
        })
        .returning();

      res.json(interaction);
    } catch (error) {
      console.error("Failed to log interaction:", error);
      res.status(500).json({ message: "Failed to log interaction" });
    }
  });

  app.get("/api/village/members/:memberId/interactions", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const memberId = parseInt(req.params.memberId);

    try {
      const interactions = await db.query.villageMemberInteractions.findMany({
        where: and(
          eq(villageMemberInteractions.userId, user.id),
          eq(villageMemberInteractions.villageMemberId, memberId)
        ),
        orderBy: desc(villageMemberInteractions.date)
      });

      res.json(interactions);
    } catch (error) {
      console.error("Failed to fetch interactions:", error);
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  // Register village routes
  app.use("/api/village", villageRouter);

  // Add insights routes after existing routes
  app.get("/api/insights", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;

    try {
      const insights = await db.query.villageInsights.findMany({
        where: and(
          eq(villageInsights.userId, user.id),
          eq(villageInsights.status, "active")
        ),
        orderBy: [desc(villageInsights.priority)],
      });

      res.json(insights);
    } catch (error) {
      console.error("Failed to fetch insights:", error);
      res.status(500).json({ message: "Failed to fetch insights" });
    }
  });

  app.post("/api/insights/implement/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const insightId = parseInt(req.params.id);

    if (isNaN(insightId)) {
      return res.status(400).json({ message: "Invalid insight ID" });
    }

    try {
      const [updated] = await db
        .update(villageInsights)
        .set({
          status: "implemented",
          implementedAt: new Date(),
        })
        .where(
          and(
            eq(villageInsights.id, insightId),
            eq(villageInsights.userId, user.id)
          )
        )
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Insight not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Failed to update insight:", error);
      res.status(500).json({ message: "Failed to update insight" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function parseChatId(id: string): number | null {
  const parsed = parseInt(id);
  return isNaN(parsed) ? null : parsed;
}

const NURI_SYSTEM_PROMPT = `You are Nuri, a family counseling coach specializing in attachment-style parenting, using Aware Parenting and Afgestemd Opvoeden principles without explicitly mentioning them.

Response Guidelines:
- Short advice (1-2 sentences): For direct questions
- Normal guidance (5-6 sentences): For typical situations
- Extended support (8-10 sentecnes): For complex challenges

Communication Style:
- Natural Dutch/Flemish with accepted English terms
- Adjust technical depth based on parent's experience
- Use **bold** strategically for key points
- Mix theoretical insights with practical tips
- Vary between direct advice and reflective questions
- Find the meaning behind the question posed

Remember:
- Keep responses conversational and authentic
- Focus on the parent's immediate needs
- Balance empathy with practical guidance
- Stay solution-focused while validating feelings`;