import { Chat, VillageMember, PromptSuggestion } from "@db/schema";
import { VILLAGE_RULES, analyzeVillageGaps } from "./village-rules";
import { MemoryService } from "../services/memory";

interface Message {
  content: string;
  // Add other message properties as needed
}

interface ChatWithMessages extends Chat {
  messages: Message[];
}

export async function generateVillageSuggestions(
  userId: number,
  members: VillageMember[],
  recentChats: ChatWithMessages[],
  memoryService: MemoryService
): Promise<Omit<PromptSuggestion, 'id'>[]> {
  const gaps = analyzeVillageGaps(members);
  const suggestions: Omit<PromptSuggestion, 'id'>[] = [];

  // Get context from recent chats
  const recentMessages = recentChats
    .slice(0, 2) // Last 2 chats
    .flatMap(chat => chat.messages)
    .slice(-5); // Last 5 messages

  // Join recent message content for context
  const chatContext = recentMessages
    .map(msg => msg.content)
    .join(' ');

  // Get relevant memories
  const memories = await memoryService.getRelevantMemories(
    userId,
    chatContext
  );

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  // Generate personalized suggestions based on gaps and context
  if (gaps.circles.get(1) < VILLAGE_RULES.CIRCLE_MINIMUMS[1]) {
    suggestions.push({
      userId,
      text: 'Consider strengthening existing relationships to move them to your inner circle',
      type: 'network_growth',
      context: 'Based on your recent conversations about support needs',
      relevance: 8,
      usedAt: null,
      expiresAt,
      createdAt: now
    });
  }

  // Add suggestion for outer circle engagement if needed
  if (gaps.circles.get(4) < VILLAGE_RULES.CIRCLE_MINIMUMS[4]) {
    suggestions.push({
      userId,
      text: 'Your outer support network could use more diversity. Consider joining community groups or parent meetups.',
      type: 'network_expansion',
      context: 'Analysis of your village structure',
      relevance: 6,
      usedAt: null,
      expiresAt,
      createdAt: now
    });
  }

  // Add memory-based suggestions if available
  if (memories.length > 0) {
    suggestions.push({
      userId,
      text: 'You might want to reconnect with someone you shared a meaningful moment with',
      type: 'memory_connection',
      context: 'Based on your past experiences',
      relevance: 7,
      usedAt: null,
      expiresAt,
      createdAt: now
    });
  }

  // Ensure at least two suggestions
  if (suggestions.length < 2) {
    suggestions.push({
      userId,
      text: 'Regular check-ins help maintain strong connections. Consider reaching out to a village member this week.',
      type: 'network_maintenance',
      context: 'Maintaining healthy relationships',
      relevance: 5,
      usedAt: null,
      expiresAt,
      createdAt: now
    });
  }

  return suggestions.sort((a, b) => b.relevance - a.relevance);
}