import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import {
  users,
  villageMembers,
  villageMemberMemories,
  villageMemberInteractions,
  chats,
  messageFeedback,
  promptSuggestions,
  suggestionFeedback,
  parentProfiles,
} from "@db/schema";
import path from "path";
import fs from "fs/promises";
import fileUpload from "express-fileupload";
import { eq, desc, and, isNull, gte } from "drizzle-orm";
import { anthropic } from "./anthropic";
import type { User } from "./auth";
import { memoryService } from "./services/memory";
import { villageRouter } from "./routes/village";
import { searchBooks } from "./rag";

export function registerRoutes(app: Express): Server {
  // Add file upload middleware
  app.use(
    fileUpload({
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max file size
      abortOnLimit: true,
      createParentPath: true,
    }),
  );

  setupAuth(app);

  // Add onboarding routes
  app.get("/api/onboarding/progress", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;

    try {
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      res.json({
        currentOnboardingStep: profile?.currentOnboardingStep || 1,
        completedOnboarding: profile?.completedOnboarding || false,
        onboardingData: profile?.onboardingData || {},
      });
    } catch (error) {
      console.error("Failed to fetch onboarding progress:", error);
      res.status(500).json({
        message: "Failed to fetch onboarding progress",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/onboarding/progress", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;
    const { step, data } = req.body;

    try {
      // Extract fields from onboarding data
      const name = data.basicInfo?.name || "";
      const email = data.basicInfo?.email || "";
      const stressLevel = data.stressAssessment?.stressLevel || "moderate"; // Default value
      const experienceLevel = data.basicInfo?.experienceLevel || "first_time"; // Default value

      // Only save to parent_profiles if we have the required data
      if (step >= 2 && data.basicInfo?.name && data.basicInfo?.email) {
        const [profile] = await db
          .insert(parentProfiles)
          .values({
            userId: user.id,
            name,
            email,
            stressLevel: stressLevel as any,
            experienceLevel: experienceLevel as any,
            currentOnboardingStep: step,
            onboardingData: data,
            completedOnboarding: false,
          })
          .onConflictDoUpdate({
            target: parentProfiles.userId,
            set: {
              name,
              email,
              stressLevel:
                (data.stressAssessment?.stressLevel as any) || undefined,
              experienceLevel:
                (data.basicInfo?.experienceLevel as any) || undefined,
              currentOnboardingStep: step,
              onboardingData: data,
              updatedAt: new Date(),
            },
          })
          .returning();

        return res.json({
          currentOnboardingStep: profile.currentOnboardingStep,
          completedOnboarding: profile.completedOnboarding,
          onboardingData: profile.onboardingData,
        });
      }

      // For early steps, just return the current progress without saving to database
      res.json({
        currentOnboardingStep: step,
        completedOnboarding: false,
        onboardingData: data,
      });
    } catch (error) {
      console.error("Failed to save onboarding progress:", error);
      res.status(500).json({
        message: "Failed to save onboarding progress",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/onboarding/complete", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;
    const finalData = req.body;

    try {
      // Extract required fields from onboarding data
      const name = finalData.basicInfo?.name;
      const email = finalData.basicInfo?.email;
      const stressLevel = finalData.stressAssessment?.stressLevel;
      const experienceLevel = finalData.basicInfo?.experienceLevel;

      // Validate required fields
      if (!name || !email || !stressLevel || !experienceLevel) {
        return res.status(400).json({
          message: "Missing required fields",
          details: {
            name: !name,
            email: !email,
            stressLevel: !stressLevel,
            experienceLevel: !experienceLevel,
          },
        });
      }

      // Store onboarding data in mem0
      try {
        const onboardingContent = `
Parent Profile:
Name: ${name}
Email: ${email}
Experience Level: ${experienceLevel}
Stress Level: ${stressLevel}
${finalData.stressAssessment?.primaryConcerns ? `Primary Concerns: ${finalData.stressAssessment.primaryConcerns.join(", ")}` : ""}

${
  finalData.childProfiles && Array.isArray(finalData.childProfiles)
    ? `Children:
${finalData.childProfiles
  .map(
    (child: any) =>
      `- ${child.name} (Age: ${child.age})${child.specialNeeds?.length ? ` Special needs: ${child.specialNeeds.join(", ")}` : ""}`,
  )
  .join("\n")}`
    : ""
}

${
  finalData.goals
    ? `
Goals:
${finalData.goals.shortTerm?.length ? `Short term: ${finalData.goals.shortTerm.join(", ")}` : ""}
${finalData.goals.longTerm?.length ? `Long term: ${finalData.goals.longTerm.join(", ")}` : ""}
${finalData.goals.supportAreas?.length ? `Support areas: ${finalData.goals.supportAreas.join(", ")}` : ""}
Communication preference: ${finalData.goals.communicationPreference || "Not specified"}
`
    : ""
}`;

        await memoryService.createMemory(user.id, onboardingContent, {
          type: "onboarding_profile",
          category: "user_profile",
          source: "onboarding",
        });

        console.log("Successfully stored onboarding data in memory layer");
      } catch (memoryError) {
        console.error(
          "Failed to store onboarding data in memory:",
          memoryError,
        );
        // Continue with database storage even if memory storage fails
      }

      const [profile] = await db
        .insert(parentProfiles)
        .values({
          userId: user.id,
          name,
          email,
          stressLevel: stressLevel as any,
          experienceLevel: experienceLevel as any,
          onboardingData: finalData,
          completedOnboarding: true,
          currentOnboardingStep: 4, // Final step
        })
        .onConflictDoUpdate({
          target: parentProfiles.userId,
          set: {
            name,
            email,
            stressLevel: stressLevel as any,
            experienceLevel: experienceLevel as any,
            onboardingData: finalData,
            completedOnboarding: true,
            currentOnboardingStep: 4,
            updatedAt: new Date(),
          },
        })
        .returning();

      res.json({
        message: "Onboarding completed successfully",
        profile,
      });
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      res.status(500).json({
        message: "Failed to complete onboarding",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Profile picture upload endpoint
  app.post("/api/profile/picture", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const file = req.files?.profilePicture;

    if (!file || Array.isArray(file)) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        message:
          "Invalid file type. Only JPEG, PNG, GIF and WebP images are allowed",
      });
    }

    if (file.size > 2 * 1024 * 1024) {
      return res
        .status(400)
        .json({ message: "File size must be less than 2MB" });
    }

    try {
      // Create unique filename
      const fileName = `profile-${user.id}-${Date.now()}${path.extname(file.name)}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      const filePath = path.join(uploadDir, fileName);

      // Ensure uploads directory exists
      await fs.mkdir(uploadDir, { recursive: true });

      // Move uploaded file
      await file.mv(filePath);

      // Update user profile in database
      await db
        .update(users)
        .set({ profilePicture: `/uploads/${fileName}` })
        .where(eq(users.id, user.id));

      res.json({ profilePicture: `/uploads/${fileName}` });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
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
        const childProfiles = Array.isArray(
          profile.onboardingData.childProfiles,
        )
          ? profile.onboardingData.childProfiles
          : [];
        personalizedContext = `
Parent's Profile:
- Experience Level: ${profile.onboardingData.basicInfo?.experienceLevel || "Not specified"}
- Stress Level: ${profile.onboardingData.stressAssessment?.stressLevel || "Not specified"}
- Primary Concerns: ${profile.onboardingData.stressAssessment?.primaryConcerns?.join(", ") || "None specified"}
${
  childProfiles.length > 0
    ? childProfiles
        .map(
          (child: any) =>
            `Child: ${child.name}, Age: ${child.age}${child.specialNeeds?.length ? `, Special needs: ${child.specialNeeds.join(", ")}` : ""}`,
        )
        .join("\n")
    : "No children profiles specified"
}

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
      let contextualizedPrompt = "";

      try {
        // Get user's profile data for context
        const profile = await db.query.parentProfiles.findFirst({
          where: eq(parentProfiles.userId, user.id),
        });

        // Add village context to the prompt
        const villageContextString = await getVillageContext(user.id);

        const ragContext = await searchBooks(
          req.body.messages[req.body.messages.length - 1].content,
          2,
        );

        const ragContent = ragContext.map((document) => document.pageContent);
        const mergedRAG = ragContent.join("\n\n");
        // console.log(mergedRAG);
        // Get relevant memories for context
        const relevantMemories = await memoryService.getRelevantMemories(
          user.id,
          req.body.messages[req.body.messages.length - 1].content,
        );

        const { PATTERN_PROMPTS, STRUCTURE_PROMPTS } = await import(
          "./lib/response-patterns"
        );
        const getRandomPattern = () =>
          Math.floor(Math.random() * PATTERN_PROMPTS.length);
        const getRandomStructure = () =>
          Math.floor(Math.random() * STRUCTURE_PROMPTS.length);
        const pattern = getRandomPattern();
        const structure = getRandomStructure();

        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 512,
          temperature: 0.7,
          system: `
CONTEXT SECTIONS:

1. User Profile:
${
  profile?.onboardingData
    ? `
- Experience Level: ${profile.onboardingData.basicInfo?.experienceLevel || "Not specified"}
- Stress Level: ${profile.onboardingData.stressAssessment?.stressLevel || "Not specified"}
- Primary Concerns: ${profile.onboardingData.stressAssessment?.primaryConcerns?.join(", ") || "None specified"}
${
  profile.onboardingData.childProfiles
    ?.map(
      (child: any) =>
        `Child: ${child.name}, Age: ${child.age}${child.specialNeeds?.length ? `, Special needs: ${child.specialNeeds.join(", ")}` : ""}`,
    )
    .join("\n") || "No children profiles specified"
}`
    : ""
}

2. Village Network:
${villageContextString || "No village context available"}

3. Conversation History:
${
  relevantMemories && relevantMemories.length > 0
    ? relevantMemories
        .filter((m) => m.relevance && m.relevance >= 0.6)
        .slice(0, 3)
        .map(
          (m) =>
            `Previous relevant conversation (relevance: ${m.relevance?.toFixed(2)}): ${m.content}`,
        )
        .join("\n\n")
    : "No relevant conversation history"
}

4. Potential retrieved content that can help you with answering:
These contents are coming mainly from 2 books that are written by "Lynn Geerinck", the co-founder of Nuri. The books names are "Goed Omringd" and "Wie zorgt voor mijn kinderen". The content start here:
<start helper content>
${mergedRAG || "No relevant content available"}
<end helper content>
CONTEXT:
-------------------
${NURI_SYSTEM_PROMPT}

RESPONSE STYLE:
${PATTERN_PROMPTS[pattern]}
${STRUCTURE_PROMPTS[structure]}

ADDITIONAL INSTRUCTIONS:
- Despite the context above, keep responses concise and focused
- Prioritize addressing the current question directly
- Use context to inform the response, not to expand it
`,
          messages: req.body.messages,
        });

        const messageContent =
          response.content[0].type === "text" ? response.content[0].text : "";

        // Store conversation in memory
        try {
          // Store user's message with proper metadata
          await memoryService.createMemory(
            user.id,
            req.body.messages[req.body.messages.length - 1].content,
            {
              role: "user",
              messageIndex: req.body.messages.length - 1,
              chatId: req.body.chatId || "new",
              source: "nuri-chat",
              type: "conversation",
              category: "chat_history",
              timestamp: new Date().toISOString(),
            },
          );

          // Store assistant's response with proper metadata
          await memoryService.createMemory(user.id, messageContent, {
            role: "assistant",
            messageIndex: req.body.messages.length,
            chatId: req.body.chatId || "new",
            source: "nuri-chat",
            type: "conversation",
            category: "chat_history",
            timestamp: new Date().toISOString(),
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
      } catch (error) {
        console.error("API error:", error);
        res.status(500).json({
          message: "Failed to process request",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } catch (error) {
      console.error("Authentication error:", error);
      res.status(401).json({
        message: "Authentication failed",
        error: error instanceof Error ? error.message : "Unknown error",
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

      console.log(
        "Context analysis - relevant memories found:",
        relevantMemories.length,
      );
      console.log(
        "Memory relevance scores:",
        relevantMemories.map((m) => ({
          relevance: m.relevance,
          contentPreview: m.content.substring(0, 50),
        })),
      );

      // Filter memories by relevance
      const significantMemories = relevantMemories
        .filter((m) => m.relevance && m.relevance >= 0.6)
        .slice(0, 3);

      const memoryContext = significantMemories
        .map(
          (m) =>
            `Previous relevant conversation (relevance: ${m.relevance?.toFixed(2)}): ${m.content}`,
        )
        .join("\n\n");

      console.log("Using memory context length:", memoryContext.length);
      console.log(
        "Number of significant memories used:",
        significantMemories.length,
      );

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
  "title": "shorttitle capturing main parenting theme (max 5 words)",
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

  app.get("/api/insights", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;

    try {
      console.log("Generating insights for user:", user.id);

      // Get all village members
      const members = await db
        .select()
        .from(villageMembers)
        .where(eq(villageMembers.userId, user.id));

      console.log("Found village members:", members.length);

      const insights: Array<typeof parentProfiles.$inferInsert> = [];

      // Always generate some basic insights if we have members
      if (members.length > 0) {
        // Generate category distribution insight
        const categoryCounts = new Map<string, number>();
        members.forEach((member) => {
          if (member.category) {
            categoryCounts.set(
              member.category,
              (categoryCounts.get(member.category) || 0) + 1,
            );
          }
        });

        // Check category balance
        const categories = ["informeel", "formeel", "inspiratie"];
        categories.forEach((category) => {
          if (
            !categoryCounts.has(category) ||
            categoryCounts.get(category)! < 2
          ) {
            insights.push({
              userId: user.id,
              type: "network_gap",
              title: `Strengthen Your ${category} Support`,
              description: `Your village could benefit from more ${category} support members.`,
              suggestedAction: `Consider adding more ${category} connections to create a more balanced support network.`,
              priority: 2,
              status: "active",
              relatedMemberIds: [],
              metadata: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        });

        // Generate connection strength insights
        members.forEach((member) => {
          if (member.contactFrequency === "S") {
            insights.push({
              userId: user.id,
              type: "connection_strength",
              title: `Strengthen Bond with ${member.name}`,
              description: `Regular contact with ${member.name} can enhance your support network.`,
              suggestedAction:
                "Try increasing contact frequency through regular check-ins or activities.",
              priority: 3,
              status: "active",
              relatedMemberIds: [member.id],
              metadata: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        });

        // Generate circle balance insights
        const circleDistribution = new Map<number, number>();
        members.forEach((member) => {
          circleDistribution.set(
            member.circle,
            (circleDistribution.get(member.circle) || 0) + 1,
          );
        });

        if (!circleDistribution.has(1) || circleDistribution.get(1)! < 3) {
          insights.push({
            userId: user.id,
            type: "network_gap",
            title: "Strengthen Inner Circle",
            description:
              "Your inner circle could benefit from more close connections.",
            suggestedAction:
              "Consider which relationships could be strengthened to become part of your inner circle.",
            priority: 1,
            status: "active",
            relatedMemberIds: [],
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      console.log("Generated insights:", insights.length);

      // Store new insights if we have any
      if (insights.length > 0) {
        const storedInsights = await db
          .insert(parentProfiles)
          .values(insights)
          .returning();

        console.log("Stored insights:", storedInsights.length);
        return res.json(storedInsights);
      }

      // If no new insights, return empty array
      return res.json([]);
    } catch (error) {
      console.error("Failed to generate insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // Implement insight endpoint
  app.post("/api/insights/:id/implement", async (req, res) => {
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
        .update(parentProfiles)
        .set({
          status: "implemented",
          implementedAt: new Date(),
        })
        .where(
          and(
            eq(parentProfiles.id, insightId),
            eq(parentProfiles.userId, user.id),
          ),
        )
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Insight not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error implementing insight:", error);
      res.status(500).json({ message: "Failed to implement insight" });
    }
  });

  app.get("/api/suggestions/generate", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Notauthenticated");
    }
    const user = req.user as User;
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
            content: `Based on this message and conversation history, generate 3-5 natural follow-up prompts that would help continue the conversation naturally. These should be phrased as things a parent might say or ask.
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
          eq(villageMemberMemories.villageMemberId, memberId),
        ),
        orderBy: desc(villageMemberMemories.date),
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
          eq(villageMembers.userId, user.id),
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
          notes,
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
          eq(villageMemberInteractions.villageMemberId, memberId),
        ),
        orderBy: desc(villageMemberInteractions.date),
      });

      res.json(interactions);
    } catch (error) {
      console.error("Failed to fetch interactions:", error);
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  // Register village routes
  app.use("/api/village", villageRouter);

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
        .update(parentProfiles)
        .set({
          status: "implemented",
          implementedAt: new Date(),
        })
        .where(
          and(
            eq(parentProfiles.id, insightId),
            eq(parentProfiles.userId, user.id),
          ),
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

const NURI_SYSTEM_PROMPT = `You are Nuri, a family counseling coach specializing in attachment-style parenting, using Aware Parenting and Afgestemd Opvoeden principles sparingly mentioning them.

Communication Style:
- Natural Dutch/Flemish with accepted English terms
- Adjust technical depth based on parent's experience
- Use **bold** strategically for key points
- Mix theoretical insights with practical tips
- Vary between direct advice and reflective questions
- Find the meaning behind the question posed

Remember:
- Keep responses conversational and authentic
- Explore the parents context and their emotions
- Focus on the parent's immediate needs
- Balance empathy with practical guidance
- Stay solution-focused while validating feelings`;

async function getVillageContext(userId: number): Promise<string | null> {
  try {
    const members = await db.query.villageMembers.findMany({
      where: eq(villageMembers.userId, userId),
    });

    if (members.length === 0) {
      return null;
    }

    const memberNames = members.map((member) => member.name).join(", ");
    return `\n\nVillage Members: ${memberNames}`;
  } catch (error) {
    console.error("Error fetching village context:", error);
    return null;
  }
}
