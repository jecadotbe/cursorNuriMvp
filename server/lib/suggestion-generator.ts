
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
  const chatContext = recentChats
    .map(chat => chat.messages)
    .flat()
    .filter(msg => 
      msg.content.toLowerCase().includes('support') ||
      msg.content.toLowerCase().includes('help') ||
      msg.content.toLowerCase().includes('relationship')
    );

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

  return suggestions.sort((a, b) => b.priority - a.priority);
}
