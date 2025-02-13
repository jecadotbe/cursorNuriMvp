// routes.ts
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
import { generateVillageSuggestions } from "./lib/suggestion-generator";

// Suggestion categories constant
const SUGGESTION_CATEGORIES = {
  LEARNING: "learning",
  VILLAGE: "village",
  CHILD_DEVELOPMENT: "child_development",
  STRESS: "stress",
  PERSONAL_GROWTH: "personal_growth",
} as const;

// Type definition for child profile
type ChildProfile = {
  name: string;
  age: number;
  specialNeeds: string[];
};

// ==========================================
// Helper Middleware & Functions
// ==========================================

// Middleware to ensure the user is authenticated.
function ensureAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticated" });
}

// Centralized error handler.
function handleRouteError(
  res: any,
  error: any,
  contextMessage = "An error occurred",
) {
  console.error(`${contextMessage}:`, error);
  res.status(500).json({
    message: contextMessage,
    error: error instanceof Error ? error.message : "Unknown error",
  });
}

// Parse a chat ID from the request parameters.
function parseChatId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return isNaN(parsed) ? null : parsed;
}

// System prompt constant.
const NURI_SYSTEM_PROMPT = `You are Nuri, a digital (iOS & Android) app specialized in family counseling with a focus on attachment-style parenting, using Aware Parenting and Afgestemd Opvoeden principles sparingly. The app has three domains: The Village for building a real-life support network, Learning for tips and methods, and the Homepage for actions and insights.

Date and time: {{currentDateTime}}

Communication Style:
- Keep answer conversational and short max 3 lines
- Natural Dutch/Flemish with accepted English terms
- Adjust technical depth based on parent's experience
- Use **bold** strategically for key points
- Mix theoretical insights with practical tips
- Vary between direct advice and reflective questions
- Explore the parent's context and emotions
- Stay solution-focused while validating feelings`;

// ==========================================
// Register Routes Function
// ==========================================
export function registerRoutes(app: Express): Server {
  // -------------------------------
  // Global Middleware
  // -------------------------------
  // File upload middleware
  app.use(
    fileUpload({
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
      abortOnLimit: true,
      createParentPath: true,
    }),
  );

  // Setup authentication and sessions
  setupAuth(app);

  // ========================================
  // Onboarding Endpoints
  // ========================================
  app.get("/api/onboarding/progress", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
        columns: {
          currentOnboardingStep: true,
          completedOnboarding: true,
          onboardingData: true,
        },
      });
      res.json({
        currentOnboardingStep: profile?.currentOnboardingStep || 1,
        completedOnboarding: profile?.completedOnboarding || false,
        onboardingData: profile?.onboardingData || {},
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch onboarding progress");
    }
  });

  app.post(
    "/api/onboarding/progress",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as User;
        const { step, data } = req.body;
        // Build a textual representation for memory storage.
        const childProfilesString = Array.isArray(data.childProfiles)
          ? data.childProfiles
              .map(
                (child: any) =>
                  `- ${child.name} (Age: ${child.age}) ${
                    child.specialNeeds?.length
                      ? `Special needs: ${child.specialNeeds.join(", ")}`
                      : "No special needs"
                  }`,
              )
              .join("\n")
          : "No children profiles added";
        const stepContent = `
Onboarding Step ${step} Progress:
${
  data.basicInfo
    ? `
Basic Information:
Name: ${data.basicInfo.name}
Email: ${data.basicInfo.email}
Experience Level: ${data.basicInfo.experienceLevel}`
    : ""
}
${
  data.stressAssessment
    ? `
Stress Assessment:
Stress Level: ${data.stressAssessment.stressLevel}
Primary Concerns: ${data.stressAssessment.primaryConcerns?.join(", ") || "None"}
Support Network: ${data.stressAssessment.supportNetwork?.join(", ") || "None"}`
    : ""
}
${
  data.childProfiles
    ? `
Child Profiles:
${childProfilesString}`
    : ""
}
${
  data.goals
    ? `
Goals:
Short Term: ${data.goals.shortTerm?.join(", ") || "None"}
Long Term: ${data.goals.longTerm?.join(", ") || "None"}
Support Areas: ${data.goals.supportAreas?.join(", ") || "None"}
Communication Preference: ${data.goals.communicationPreference || "Not specified"}`
    : ""
}
        `;
        // Save memory (noncritical—log error and continue if fails)
        try {
          await memoryService.createMemory(user.id, stepContent, {
            type: "onboarding_progress",
            category: "user_onboarding",
            step,
            isComplete: false,
            source: "onboarding_form",
            timestamp: new Date().toISOString(),
            metadata: { stepData: data, progressPercentage: (step / 4) * 100 },
          });
        } catch (memoryError) {
          console.error("Memory storage failed:", memoryError);
        }
        // Upsert the profile if required data exists.
        if (step >= 2 && data.basicInfo?.name && data.basicInfo?.email) {
          const [profile] = await db
            .insert(parentProfiles)
            .values({
              userId: user.id,
              name: data.basicInfo.name,
              email: data.basicInfo.email,
              stressLevel: data.stressAssessment?.stressLevel || "moderate",
              experienceLevel: data.basicInfo.experienceLevel || "first_time",
              currentOnboardingStep: step,
              onboardingData: {
                ...data,
                childProfiles: Array.isArray(data.childProfiles)
                  ? data.childProfiles
                  : [],
              },
              completedOnboarding: false,
              primaryConcerns: data.stressAssessment?.primaryConcerns || [],
              supportNetwork: data.stressAssessment?.supportNetwork || [],
            })
            .onConflictDoUpdate({
              target: parentProfiles.userId,
              set: {
                name: data.basicInfo.name,
                email: data.basicInfo.email,
                stressLevel: data.stressAssessment?.stressLevel,
                experienceLevel: data.basicInfo.experienceLevel,
                currentOnboardingStep: step,
                onboardingData: {
                  ...data,
                  childProfiles: Array.isArray(data.childProfiles)
                    ? data.childProfiles
                    : [],
                },
                primaryConcerns: data.stressAssessment?.primaryConcerns,
                supportNetwork: data.stressAssessment?.supportNetwork,
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
        res.json({
          currentOnboardingStep: step,
          completedOnboarding: false,
          onboardingData: {
            ...data,
            childProfiles: Array.isArray(data.childProfiles)
              ? data.childProfiles
              : [],
          },
        });
      } catch (error) {
        handleRouteError(res, error, "Failed to save onboarding progress");
      }
    },
  );

  app.post(
    "/api/onboarding/complete",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as User;
        const finalData = req.body;
        // Set session flag for suggestion refresh.
        req.session.checkSuggestions = true;
        await req.session.save();

        // Validate required fields.
        const { name, stressLevel, experienceLevel } = {
          name: finalData.basicInfo?.name,
          stressLevel: finalData.stressAssessment?.stressLevel,
          experienceLevel: finalData.basicInfo?.experienceLevel,
        };
        if (!name || !stressLevel || !experienceLevel) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        // Validate and process child profiles.
        let validatedChildProfiles: ChildProfile[] = [];
        if (Array.isArray(finalData.childProfiles)) {
          validatedChildProfiles = finalData.childProfiles.map((child: any) => {
            if (!child.name || typeof child.name !== "string") {
              throw new Error(`Invalid child name: ${JSON.stringify(child)}`);
            }
            if (
              typeof child.age !== "number" ||
              child.age < 0 ||
              child.age > 18
            ) {
              throw new Error(`Invalid age for ${child.name}: ${child.age}`);
            }
            if (!Array.isArray(child.specialNeeds)) {
              throw new Error(
                `Invalid special needs for ${child.name}: must be an array`,
              );
            }
            return {
              name: child.name,
              age: child.age,
              specialNeeds: child.specialNeeds,
            };
          });
        }
        // Store profile memory.
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // slight delay
          const onboardingContent = `
Parent Profile:
Name: ${name}
Experience Level: ${experienceLevel}
Stress Level: ${stressLevel}
${finalData.stressAssessment?.primaryConcerns ? `Primary Concerns: ${finalData.stressAssessment.primaryConcerns.join(", ")}` : ""}
${
  validatedChildProfiles.length > 0
    ? `Children:
${validatedChildProfiles
  .map(
    (child) =>
      `- ${child.name} (Age: ${child.age})${
        child.specialNeeds.length
          ? `, Special needs: ${child.specialNeeds.join(", ")}`
          : ""
      }`,
  )
  .join("\n")}`
    : "No children profiles specified"
}
${
  finalData.goals
    ? `
Goals:
${finalData.goals.shortTerm?.length ? `Short term: ${finalData.goals.shortTerm.join(", ")}` : ""}
${finalData.goals.longTerm?.length ? `Long term: ${finalData.goals.longTerm.join(", ")}` : ""}
`
    : ""
}
        `;
          await memoryService.createMemory(user.id, onboardingContent, {
            type: "onboarding_profile",
            category: "user_profile",
            source: "onboarding",
          });
        } catch (memoryError) {
          console.error("Memory storage error:", memoryError);
        }

        // Create village members from support network
        if (finalData.stressAssessment?.supportNetwork?.length) {
          const supportMembers = finalData.stressAssessment.supportNetwork
            .filter((member: string) => member.toLowerCase() !== "niemand")
            .map((member: string) => {
              // Determine member type and circle based on the name
              let type = "family";
              let circle = 2;
              let category: "informeel" | "formeel" | "inspiratie" =
                "informeel";

              if (member.toLowerCase().includes("school")) {
                type = "professional";
                circle = 3;
                category = "formeel";
              } else if (
                member.toLowerCase().includes("oma") ||
                member.toLowerCase().includes("opa")
              ) {
                type = "family";
                circle = 1;
                category = "informeel";
              }

              return {
                userId: user.id,
                name: member,
                type,
                circle,
                category,
                role:
                  type === "family" ? "Family Support" : "Professional Support",
                positionAngle: (Math.random() * 2 * Math.PI).toString(),
                contactFrequency: "M" as const,
              };
            });

          // Insert all support members into the village
          if (supportMembers.length > 0) {
            await db.insert(villageMembers).values(supportMembers);
          }
        }

        // Upsert final parent profile.
        const [profile] = await db
          .insert(parentProfiles)
          .values({
            userId: user.id,
            name,
            stressLevel,
            experienceLevel,
            onboardingData: {
              ...finalData,
              childProfiles: validatedChildProfiles,
            },
            completedOnboarding: true,
            currentOnboardingStep: 4,
            primaryConcerns: finalData.stressAssessment?.primaryConcerns || [],
            supportNetwork: finalData.stressAssessment?.supportNetwork || [],
          })
          .onConflictDoUpdate({
            target: parentProfiles.userId,
            set: {
              name,
              stressLevel,
              experienceLevel,
              onboardingData: {
                ...finalData,
                childProfiles: validatedChildProfiles,
              },
              completedOnboarding: true,
              currentOnboardingStep: 4,
              primaryConcerns: finalData.stressAssessment?.primaryConcerns,
              supportNetwork: finalData.stressAssessment?.supportNetwork,
              updatedAt: new Date(),
            },
          })
          .returning();

        res.json({ message: "Onboarding completed successfully", profile });
      } catch (error) {
        handleRouteError(res, error, "Failed to complete onboarding");
      }
    },
  );

  // ========================================
  // Profile Endpoints
  // ========================================
  app.post("/api/profile/picture", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const file = req.files?.profilePicture;
      if (!file || Array.isArray(file)) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
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
      const fileName = `profile-${user.id}-${Date.now()}${path.extname(file.name)}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      const filePath = path.join(uploadDir, fileName);
      await fs.mkdir(uploadDir, { recursive: true });
      await file.mv(filePath);
      await db
        .update(users)
        .set({ profilePicture: `/uploads/${fileName}` })
        .where(eq(users.id, user.id));
      res.json({ profilePicture: `/uploads/${fileName}` });
    } catch (error) {
      handleRouteError(res, error, "Error uploading profile picture");
    }
  });

  app.post("/api/profile/update", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const profileData = req.body;
      const [profile] = await db
        .update(parentProfiles)
        .set({ onboardingData: profileData, updatedAt: new Date() })
        .where(eq(parentProfiles.userId, user.id))
        .returning();
      res.json({ status: "success", data: profile });
    } catch (error) {
      handleRouteError(res, error, "Failed to update profile");
    }
  });

  // ========================================
  // Chat Endpoints
  // ========================================
  app.get("/api/chats/:chatId", ensureAuthenticated, async (req, res) => {
    try {
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
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch chat");
    }
  });

  app.post("/api/chat", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const lastMessage =
        req.body.messages[req.body.messages.length - 1].content;
      // Retrieve contextual data
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });
      const villageContextString = await getVillageContext(user.id);
      const ragContext = await searchBooks(lastMessage, 2);
      const mergedRAG = ragContext.map((doc) => doc.pageContent).join("\n\n");
      const relevantMemories = await memoryService.getRelevantMemories(
        user.id,
        lastMessage,
      );
      // console.log("relevantMemories :\n", relevantMemories);
      // console.log("end relevanteMemories");
      const memoryContext = relevantMemories
        .filter((m) => m.relevance && m.relevance >= 0.3)
        .map((m) => m.content)
        .join("\n\n");
      // Compose prompt for Anthropic.
      const mainPrompt = `
${NURI_SYSTEM_PROMPT}

RESPONSE STYLE:
- Use a clear, empathetic tone.
- Provide practical advice mixed with reflective questions.

CONTEXT:
1. Village Context: ${villageContextString || "No village context available"}
2. Conversation History: ${memoryContext || "No relevant conversation history"}
3. Retrieved Content: ${mergedRAG || "No relevant content available"}
      `;
      // console.log("start main prompt");
      // console.log(mainPrompt);
      // console.log("end main prompt");
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 512,
        temperature: 0.4,
        system: mainPrompt,
        messages: req.body.messages,
      });
      const messageContent =
        response.content[0].type === "text" ? response.content[0].text : "";
      // Save conversation fragments into memory.
      await memoryService.createMemory(user.id, lastMessage, {
        role: "user",
        chatId: req.body.chatId || "new",
        source: "nuri-chat",
        type: "conversation",
        category: "chat_history",
        timestamp: new Date().toISOString(),
      });
      await memoryService.createMemory(user.id, messageContent, {
        role: "assistant",
        chatId: req.body.chatId || "new",
        source: "nuri-chat",
        type: "conversation",
        category: "chat_history",
        timestamp: new Date().toISOString(),
      });
      // Save or update chat in database.
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
      res.json({ content: messageContent });
    } catch (error) {
      handleRouteError(res, error, "Failed to process chat request");
    }
  });

  app.delete("/api/chats/:chatId", ensureAuthenticated, async (req, res) => {
    try {
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
    } catch (error) {
      handleRouteError(res, error, "Failed to delete chat");
    }
  });

  app.patch("/api/chats/:chatId", ensureAuthenticated, async (req, res) => {
    try {
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
    } catch (error) {
      handleRouteError(res, error, "Failed to update chat");
    }
  });

  app.get("/api/chats", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const userChats = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: desc(chats.updatedAt),
      });
      res.json(userChats);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch chats");
    }
  });

  app.get("/api/chats/latest", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const latestChat = await db.query.chats.findFirst({
        where: eq(chats.userId, user.id),
        orderBy: desc(chats.createdAt),
      });
      res.json(latestChat || null);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch latest chat");
    }
  });

  app.post("/api/chats", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const messages = req.body.messages || [];
      let title = null,
        summary = null,
        emotionalSummary = null;
      if (messages.length > 0) {
        const analyzeResponse = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          system: `${NURI_SYSTEM_PROMPT}\n\nAnalyze this conversation and provide a JSON response with a title, summary, and emotionalJourney.`,
          messages: [
            {
              role: "user",
              content: `Conversation: ${JSON.stringify(messages)}`,
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
      const [chat] = await db
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
      res.json(chat);
    } catch (error) {
      handleRouteError(res, error, "Failed to create chat");
    }
  });

  app.post("/api/message-feedback", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
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
      handleRouteError(res, error, "Failed to save feedback");
    }
  });

  app.get(
    "/api/chats/:chatId/emotional-context",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const chatId = parseChatId(req.params.chatId);
        if (chatId === null) {
          return res.status(400).json({ message: "Invalid chat ID" });
        }
        const chat = await db.query.chats.findFirst({
          where: eq(chats.id, chatId),
          columns: { metadata: true },
        });
        if (!chat) {
          return res.status(404).json({ message: "Chat not found" });
        }
        const metadata = chat.metadata as { emotionalContext?: string } | null;
        res.json({ emotionalContext: metadata?.emotionalContext || null });
      } catch (error) {
        handleRouteError(res, error, "Failed to get emotional context");
      }
    },
  );

  // ========================================
  // Suggestions Endpoints
  // ========================================
  app.post(
    "/api/suggestions/:id/feedback",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as User;
        const suggestionId = parseInt(req.params.id, 10);
        if (isNaN(suggestionId)) {
          return res.status(400).json({ message: "Invalid suggestion ID" });
        }
        const { rating, feedback } = req.body;
        if (typeof rating !== "number" || rating < 1 || rating > 5) {
          return res
            .status(400)
            .json({ message: "Rating must be between 1 and 5" });
        }
        const suggestion = await db.query.promptSuggestions.findFirst({
          where: and(
            eq(promptSuggestions.id, suggestionId),
            eq(promptSuggestions.userId, user.id),
          ),
        });
        if (!suggestion) {
          return res.status(404).json({ message: "Suggestion not found" });
        }
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
        handleRouteError(res, error, "Failed to save suggestion feedback");
      }
    },
  );

  app.get("/api/suggestions", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const now = new Date();
      const forceRefresh = req.query.refresh === "true";
      const lastMemory = await db.query.villageMemberMemories.findFirst({
        where: eq(villageMemberMemories.userId, user.id),
        orderBy: desc(villageMemberMemories.createdAt),
      });
      const lastSuggestion = await db.query.promptSuggestions.findFirst({
        where: eq(promptSuggestions.userId, user.id),
        orderBy: desc(promptSuggestions.createdAt),
      });
      const hasNewContent =
        lastMemory &&
        lastSuggestion &&
        lastMemory.createdAt > lastSuggestion.createdAt;
      if (!forceRefresh && !hasNewContent) {
        const existingSuggestions = await db.query.promptSuggestions.findMany({
          where: and(
            eq(promptSuggestions.userId, user.id),
            isNull(promptSuggestions.usedAt),
            gte(promptSuggestions.expiresAt, now),
          ),
          orderBy: desc(promptSuggestions.createdAt),
          limit: 3,
        });
        if (existingSuggestions.length >= 3) {
          return res.json(existingSuggestions);
        }
      }
      const existingSuggestions = await db.query.promptSuggestions.findMany({
        where: and(
          eq(promptSuggestions.userId, user.id),
          isNull(promptSuggestions.usedAt),
          gte(promptSuggestions.expiresAt, now),
        ),
        orderBy: desc(promptSuggestions.createdAt),
        limit: 3,
      });
      if (existingSuggestions.length >= 3) {
        return res.json(existingSuggestions);
      }
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });
      const recentChats = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: desc(chats.updatedAt),
        limit: 5,
      });
      const relevantMemories = await memoryService.getRelevantMemories(
        user.id,
        req.body.messages?.[req.body.messages.length - 1]?.content || "",
      );
      const memoryContext = relevantMemories
        .filter((m) => m.relevance && m.relevance >= 0.6)
        .map((m) => m.content)
        .join("\n\n");
      let suggestionPriorities: string[] = [];
      if (profile?.onboardingData) {
        const { stressAssessment, goals } = profile.onboardingData;
        if (
          stressAssessment?.stressLevel === "high" ||
          stressAssessment?.stressLevel === "very_high"
        ) {
          suggestionPriorities.push(SUGGESTION_CATEGORIES.STRESS);
        }
        if (
          !stressAssessment?.supportNetwork?.length ||
          stressAssessment.supportNetwork.includes("niemand")
        ) {
          suggestionPriorities.push(SUGGESTION_CATEGORIES.VILLAGE);
        }
        if (profile.experienceLevel === "first_time") {
          suggestionPriorities.push(SUGGESTION_CATEGORIES.LEARNING);
        }
        if (goals?.shortTerm?.length || goals?.longTerm?.length) {
          suggestionPriorities.push(SUGGESTION_CATEGORIES.PERSONAL_GROWTH);
        }
        if (
          Array.isArray(profile.onboardingData.childProfiles) &&
          profile.onboardingData.childProfiles.length > 0
        ) {
          suggestionPriorities.push(SUGGESTION_CATEGORIES.CHILD_DEVELOPMENT);
        }
      }
      if (suggestionPriorities.length === 0) {
        suggestionPriorities = Object.values(SUGGESTION_CATEGORIES);
      }
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

Generate suggestions based on these priorities: ${suggestionPriorities.join(", ")}

${personalizedContext ? `Consider this parent's profile and context:\n${personalizedContext}\n` : ""}
${memoryContext ? `Previous conversations for context:\n${memoryContext}` : ""}

Generate varied suggestions focusing on the user's priorities. For new users or those with limited chat history, focus on their onboarding information to provide personalized suggestions.`,
        messages: [
          {
            role: "user",
            content: `Based on the parent's profile and conversation history, generate a follow-up prompt that aligns with their priorities and needs. Format the response exactly like this:
{
  "prompt": {
    "text": "follow-up question or suggestion",
    "type": "action" | "follow_up",
    "category": "${Object.values(SUGGESTION_CATEGORIES).join('" | "')}",
    "relevance": 1.0,
    "context": "new" | "existing",
    "relatedChatId": null,
    "relatedChatTitle": null
  }
}`,
          },
        ],
      });
      let responseText =
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
      const titleResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: `Generate a short, descriptive title (max 5 words) for this suggestion: "${parsedResponse.prompt.text}"`,
          },
        ],
      });
      const generatedTitle =
        titleResponse.content[0].type === "text"
          ? titleResponse.content[0].text.trim()
          : "New Suggestion";
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
          relatedChatId: parsedResponse.prompt.relatedChatId || null,
          relatedChatTitle: parsedResponse.prompt.relatedChatTitle || null,
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        })
        .returning();
      res.json(suggestion);
    } catch (error) {
      handleRouteError(res, error, "Failed to generate suggestion");
    }
  });

  app.get("/api/suggestions/village", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const now = new Date();

      // Get village members
      const members = await db.query.villageMembers.findMany({
        where: eq(villageMembers.userId, user.id),
      });

      // Get parent profile
      const parentProfile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      // Get recent chats
      const recentChats = await db.query.chats.findMany({
        where: eq(chats.userId, user.id),
        orderBy: desc(chats.updatedAt),
        limit: 3,
      });

      // Prepare context object
      const villageContext = {
        recentChats: recentChats.map((chat) => ({
          ...chat,
          messages: Array.isArray(chat.messages) ? chat.messages : [],
        })),
        parentProfile,
        childProfiles: parentProfile?.onboardingData?.childProfiles || [],
        challenges:
          parentProfile?.onboardingData?.stressAssessment?.primaryConcerns ||
          [],
        memories: [],
      };

      // Generate new suggestions
      const suggestions = await generateVillageSuggestions(
        user.id,
        members,
        villageContext,
        memoryService,
      );

      // Return only the first 3 suggestions without storing them
      res.json(
        suggestions.slice(0, 3).map((s, i) => ({
          ...s,
          id: i + 1, // Assign temporary IDs
          createdAt: now,
          updatedAt: now,
        })),
      );
    } catch (error) {
      console.error("Error generating village suggestions:", error);
      res.status(500).json({
        error: "Failed to generate suggestions",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post(
    "/api/suggestions/:id/dismiss",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as User;
        const suggestionId = parseInt(req.params.id, 10);
        if (isNaN(suggestionId)) {
          return res.status(400).json({ message: "Invalid suggestion ID" });
        }
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
        handleRouteError(res, error, "Failed to dismiss suggestion");
      }
    },
  );

  app.post(
    "/api/suggestions/:id/use",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as User;
        const suggestionId = parseInt(req.params.id, 10);
        if (isNaN(suggestionId)) {
          return res.status(400).json({ message: "Invalid suggestion ID" });
        }
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
        handleRouteError(res, error, "Failed to mark suggestion as used");
      }
    },
  );

  // ========================================
  // Context Analysis Endpoint
  // ========================================
  app.post("/api/analyze-context", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const { messages } = req.body;
      const relevantMemories = await memoryService.getRelevantMemories(
        user.id,
        messages[messages.length - 1]?.content || "",
      );
      const significantMemories = relevantMemories
        .filter((m) => m.relevance && m.relevance >= 0.6)
        .slice(0, 3);
      const memoryContext = significantMemories
        .map(
          (m) =>
            `Previous relevant conversation (relevance: ${m.relevance?.toFixed(
              2,
            )}): ${m.content}`,
        )
        .join("\n\n");
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        system: `${NURI_SYSTEM_PROMPT}\n\nAnalyze the conversation and provide a follow-up prompt based on this context:\n${memoryContext}`,
        messages: [
          {
            role: "user",
            content:
              "Based on these messages and the user's conversation history, generate a follow-up prompt in the specified JSON format.",
          },
        ],
      });
      let responseText =
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
      res.json(parsedResponse);
    } catch (error) {
      handleRouteError(res, error, "Failed to analyze context");
    }
  });

  // ========================================
  // Insights Endpoints
  // ========================================
  app.get("/api/insights", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const members = await db
        .select()
        .from(villageMembers)
        .where(eq(villageMembers.userId, user.id));
      const insights: any[] = [];
      if (members.length > 0) {
        const categoryCounts = new Map<string, number>();
        members.forEach((member) => {
          if (member.category) {
            categoryCounts.set(
              member.category,
              (categoryCounts.get(member.category) || 0) + 1,
            );
          }
        });
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
              suggestedAction: `Consider adding more ${category} connections.`,
              priority: 2,
              status: "active",
              relatedMemberIds: [],
              metadata: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        });
        members.forEach((member) => {
          if (member.contactFrequency === "S") {
            insights.push({
              userId: user.id,
              type: "connection_strength",
              title: `Strengthen Bond with ${member.name}`,
              description: `Regular contact with ${member.name} can enhance your support network.`,
              suggestedAction: "Try increasing contact frequency.",
              priority: 3,
              status: "active",
              relatedMemberIds: [member.id],
              metadata: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        });
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
            suggestedAction: "Consider which relationships to strengthen.",
            priority: 1,
            status: "active",
            relatedMemberIds: [],
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
      if (insights.length > 0) {
        const storedInsights = await db
          .insert(parentProfiles)
          .values(insights)
          .returning();
        return res.json(storedInsights);
      }
      return res.json([]);
    } catch (error) {
      handleRouteError(res, error, "Failed to generate insights");
    }
  });

  app.post(
    "/api/insights/:id/implement",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as User;
        const insightId = parseInt(req.params.id, 10);
        if (isNaN(insightId)) {
          return res.status(400).json({ message: "Invalid insight ID" });
        }
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
        handleRouteError(res, error, "Failed to implement insight");
      }
    },
  );

  // ========================================
  // Village Member Memories Endpoints
  // ========================================
  app.delete(
    "/api/village/members/:memberId/memories/:memoryId",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as User;
        const memberId = parseInt(req.params.memberId, 10);
        const memoryId = parseInt(req.params.memoryId, 10);
        const memory = await db.query.villageMemberMemories.findFirst({
          where: and(
            eq(villageMemberMemories.id, memoryId),
            eq(villageMemberMemories.villageMemberId, memberId),
            eq(villageMemberMemories.userId, user.id),
          ),
        });
        if (!memory) {
          return res.status(404).json({ message: "Memory not found" });
        }
        await db
          .delete(villageMemberMemories)
          .where(
            and(
              eq(villageMemberMemories.id, memoryId),
              eq(villageMemberMemories.villageMemberId, memberId),
              eq(villageMemberMemories.userId, user.id),
            ),
          );
        res.status(200).json({ message: "Memory deleted successfully" });
      } catch (error) {
        handleRouteError(res, error, "Failed to delete memory");
      }
    },
  );

  app.get(
    "/api/village/members/:memberId/memories",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as User;
        const memberId = parseInt(req.params.memberId, 10);
        const memories = await db.query.villageMemberMemories.findMany({
          where: and(
            eq(villageMemberMemories.userId, user.id),
            eq(villageMemberMemories.villageMemberId, memberId),
          ),
          orderBy: desc(villageMemberMemories.date),
        });
        res.json(memories);
      } catch (error) {
        handleRouteError(res, error, "Failed to fetch memories");
      }
    },
  );

  app.post(
    "/api/village/members/:memberId/memories",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as User;
        const memberId = parseInt(req.params.memberId, 10);
        if (isNaN(memberId)) {
          return res.status(400).json({ message: "Invalid member ID" });
        }
        const { title, content, date, emotionalImpact, tags } = req.body;
        const member = await db.query.villageMembers.findFirst({
          where: and(
            eq(villageMembers.id, memberId),
            eq(villageMembers.userId, user.id),
          ),
        });
        if (!member) {
          return res.status(404).json({ message: "Village member not found" });
        }
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
        handleRouteError(res, error, "Failed to create memory");
      }
    },
  );

  // ========================================
  // Village Member Interactions Endpoints
  // ========================================
  app.post(
    "/api/village/members/:memberId/interactions",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as User;
        const memberId = parseInt(req.params.memberId, 10);
        const { type, date, duration, quality, notes } = req.body;
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
        handleRouteError(res, error, "Failed to log interaction");
      }
    },
  );

  app.get(
    "/api/village/members/:memberId/interactions",
    ensureAuthenticated,
    async (req, res) => {
      try {
        const user = req.user as User;
        const memberId = parseInt(req.params.memberId, 10);
        const interactions = await db.query.villageMemberInteractions.findMany({
          where: and(
            eq(villageMemberInteractions.userId, user.id),
            eq(villageMemberInteractions.villageMemberId, memberId),
          ),
          orderBy: desc(villageMemberInteractions.date),
        });
        res.json(interactions);
      } catch (error) {
        handleRouteError(res, error, "Failed to fetch interactions");
      }
    },
  );

  // ========================================
  // Register Village Router (only once)
  // ========================================
  app.use("/api/village", villageRouter);

  // Create and return the HTTP server.
  const httpServer = createServer(app);
  return httpServer;
}

// ==========================================
// Helper: Get Village Context
// ==========================================
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
