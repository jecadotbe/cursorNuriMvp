import { Chat, VillageMember } from "@db/schema";
import { VILLAGE_RULES, analyzeVillageGaps } from "./village-rules";
import { MemoryService } from "../services/memory";

export async function generateVillageSuggestions(
  userId: number,
  members: VillageMember[],
  recentChats: Chat[],
  memoryService: MemoryService
) {
  const gaps = analyzeVillageGaps(members);
  const suggestions = [];

  // Get context from recent chats
  // Get last 5 chat messages for immediate context
  const recentMessages = recentChats
    .slice(0, 2) // Last 2 chats
    .map(chat => chat.messages)
    .flat()
    .slice(-5); // Last 5 messages

  const chatContext = recentMessages
    .map(msg => msg.content)
    .join(' ');

  // Get relevant memories
  const memories = await memoryService.getRelevantMemories(
    userId,
    chatContext.map(msg => msg.content).join(' ')
  );

  // Generate personalized suggestions based on gaps and context
  if (gaps.circles.get(1) < VILLAGE_RULES.CIRCLE_MINIMUMS[1]) {
    suggestions.push({
      type: 'network_growth',
      priority: 'high',
      suggestion: 'Consider strengthening existing relationships to move them to your inner circle',
      context: 'Based on your recent conversations about support needs'
    });
  }

  // Ensure at least two suggestions
  if (suggestions.length < 2) {
    suggestions.push({
      type: 'placeholder',
      priority: 'low',
      suggestion: 'More suggestions will be available soon.',
      context: 'Placeholder suggestion'
    });
  }


  return suggestions.sort((a, b) => b.priority - a.priority);
}