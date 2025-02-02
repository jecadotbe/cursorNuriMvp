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
  const recentMessages = recentChats
    .slice(0, 2) // Last 2 chats
    .map(chat => chat.messages)
    .flat()
    .slice(-5); // Last 5 messages

  // Join recent message content for context
  const chatContext = recentMessages
    ? recentMessages.map(msg => msg.content).join(' ')
    : '';

  // Get relevant memories
  const memories = await memoryService.getRelevantMemories(
    userId,
    chatContext
  );

  // Generate personalized suggestions based on gaps and context
  if (gaps.circles.get(1) < VILLAGE_RULES.CIRCLE_MINIMUMS[1]) {
    suggestions.push({
      type: 'network_growth',
      priority: 2,
      suggestion: 'Consider strengthening existing relationships to move them to your inner circle',
      context: 'Based on your recent conversations about support needs'
    });
  }

  // Add suggestion for outer circle engagement if needed
  if (gaps.circles.get(4) < VILLAGE_RULES.CIRCLE_MINIMUMS[4]) {
    suggestions.push({
      type: 'network_expansion',
      priority: 1,
      suggestion: 'Your outer support network could use more diversity. Consider joining community groups or parent meetups.',
      context: 'Analysis of your village structure'
    });
  }

  // Ensure at least two suggestions
  if (suggestions.length < 2) {
    suggestions.push({
      type: 'network_maintenance',
      priority: 0,
      suggestion: 'Regular check-ins help maintain strong connections. Consider reaching out to a village member this week.',
      context: 'Maintaining healthy relationships'
    });
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}