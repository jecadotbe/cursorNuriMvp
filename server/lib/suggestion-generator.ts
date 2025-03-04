import {
  Chat,
  VillageMember,
  PromptSuggestion,
  ParentProfile,
  ChildProfile,
  ParentingChallenge,
} from "@db/schema";
import { VILLAGE_RULES, analyzeVillageGaps } from "./village-rules";
import { MemoryService } from "../services/memory";
import { anthropic } from "../anthropic";

interface Message {
  content: string;
  role: string;
}

interface ChatWithMessages extends Chat {
  messages: Message[];
}

interface VillageContext {
  recentChats: ChatWithMessages[];
  parentProfile: ParentProfile;
  childProfiles: ChildProfile[];
  challenges: ParentingChallenge[];
  memories: any[];
}

export async function generateVillageSuggestions(
  userId: number,
  members: VillageMember[],
  context: VillageContext,
  memoryService: MemoryService,
): Promise<Omit<PromptSuggestion, "id">[]> {
  console.log("Starting village suggestion generation with context:", {
    userId,
    memberCount: members.length,
    hasParentProfile: !!context.parentProfile,
    chatCount: context.recentChats.length,
    childProfileCount: context.childProfiles.length,
    challengeCount: context.challenges.length,
  });

  const suggestions: Omit<PromptSuggestion, "id">[] = [];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    // 1. Analyze village structure and gaps
    console.log("Analyzing village gaps for members:", members);
    const gaps = analyzeVillageGaps(members);
    const circlesMap = gaps.circles || new Map();
    console.log("Village analysis results:", {
      gaps,
      circleMembers: Object.fromEntries(circlesMap),
    });

    // 2. Get recent chat context
    const chatContext = context.recentChats
      .slice(0, 3)
      .flatMap((chat) => chat.messages)
      .filter((msg) => msg.role === "user")
      .map((msg) => msg.content)
      .join(" ");
    console.log("Processed chat context length:", chatContext.length);

    // 3. Get relevant memories
    console.log("Fetching relevant memories for user:", userId);
    const memories = await memoryService.getRelevantMemories(
      userId,
      chatContext,
    );
    console.log("Retrieved memory count:", memories.length);

    // 4. Generate suggestions using Claude
    const prompt = `Generate personalized village support network suggestions based on this context:

Village Network Analysis:
- Inner circle members: ${circlesMap.get(1) || 0}
- Support circle members: ${circlesMap.get(2) || 0}
- Extended circle members: ${circlesMap.get(3) || 0}
- Community circle members: ${circlesMap.get(4) || 0}

Recent Conversations: ${chatContext}

Relevant Past Interactions: ${memories.map((m) => m.content).join(". ")}

Parent Profile:
- Stress Level: ${context.parentProfile?.stressLevel || "Unknown"}
- Primary Challenges: ${context.challenges?.map((c) => c.category).join(", ") || "None specified"}

Generate 3 specific, actionable suggestions for strengthening their village network. Each suggestion should be maximum 2 sentences, in Dutch. Focus on concrete actions. The output needs to be in a json format as follows:

[
  {
  "text" : "here you add suggestion 1 in dutch",
  "type" : "network_growth"
  },
  {
  "text" : "here you add suggestion 2 in dutch",
  "type" : "network_expansion"
  },
  {
  "text" : "here you add suggestion 3 in dutch",
  "type" : "village_maintenance"
  }
]`;

    console.log("Sending prompt to Claude, length:", prompt.length);
    const response = await anthropic.messages.create({
      messages: [{ role: "user", content: prompt }],
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      temperature: 0.4,
    });
    console.log("Received response from Claude");

    if (!response.content || response.content.length === 0) {
      console.error("Invalid response from Claude:", response);
      throw new Error("Invalid response format from Claude");
    }

    const suggestionsText = response.content[0].text;
    console.log("Raw suggestions from Claude:", suggestionsText);

    // 5. Parse suggestions from Claude
    const suggestionsData = JSON.parse(suggestionsText);
    console.log("Parsed suggestions:", suggestionsData);

    return [
      {
        userId,
        text: suggestionsData[0].text,
        type: suggestionsData[0].type,
        context: "village",
        relevance: 5,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now,
      },
      {
        userId,
        text: suggestionsData[1].text,
        type: suggestionsData[1].type,
        context: "village",
        relevance: 5,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now,
      },
      {
        userId,
        text: suggestionsData[2].text,
        type: suggestionsData[2].type,
        context: "village",
        relevance: 5,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now,
      },
    ];
  } catch (error) {
    console.error("Error generating village suggestions:", error);
    // Return a default suggestion if generation fails
    return [
      {
        userId,
        text: "Als nieuwe gebruiker gids ik je graag door de opzet van je Village!",
        type: "village_maintenance",
        context: "village",
        relevance: 5,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now,
      },
    ];
  }
}
