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
  const suggestions: Omit<PromptSuggestion, 'id'>[] = [];
  try {
    const gaps = analyzeVillageGaps(members);
    console.log('Village gaps analysis:', gaps);

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
    const circlesMap = gaps.circles || new Map();

    if (circlesMap.get(1) === undefined || circlesMap.get(1) < (VILLAGE_RULES.CIRCLE_MINIMUMS[1] || 3)) {
      suggestions.push({
        userId,
        text: 'Consider strengthening existing relationships to move them to your inner circle. Regular check-ins and meaningful conversations can help build trust.',
        type: 'network_growth',
        context: 'village',
        relevance: 8,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now
      });
    }

    // Add suggestion for outer circle engagement if needed
    if (circlesMap.get(4) === undefined || circlesMap.get(4) < (VILLAGE_RULES.CIRCLE_MINIMUMS[4] || 5)) {
      suggestions.push({
        userId,
        text: 'Your outer support network could use more diversity. Consider joining local parent groups or community activities to expand your village.',
        type: 'network_expansion',
        context: 'village',
        relevance: 6,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now
      });
    }

    // Add memory-based suggestions if available
    if (memories.length > 0) {
      suggestions.push({
        userId,
        text: 'You might want to reconnect with someone you shared a meaningful moment with recently',
        type: 'village_maintenance',
        context: 'village',
        relevance: 7,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now
      });
    }

    // Add suggestions based on village member activity
    const inactiveMembers = members
      .filter(m => m.circle <= 2) // Focus on inner circles
      .slice(0, 2); // Limit to 2 suggestions

    inactiveMembers.forEach(member => {
      suggestions.push({
        userId,
        text: `Consider reaching out to ${member.name} to maintain your close connection. Strong relationships need regular nurturing.`,
        type: 'village_maintenance',
        context: 'village',
        relevance: 5,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now
      });
    });

    // Always ensure at least one maintenance suggestion
    if (!suggestions.some(s => s.type === 'village_maintenance')) {
      suggestions.push({
        userId,
        text: 'Regular check-ins help maintain strong connections. Consider reaching out to a village member this week.',
        type: 'village_maintenance',
        context: 'village',
        relevance: 5,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now
      });
    }

    console.log(`Generated ${suggestions.length} village suggestions`);
    return suggestions.sort((a, b) => b.relevance - a.relevance);
  } catch (error) {
    console.error('Error generating village suggestions:', error);
    // Return a default suggestion in case of error
    return [{
      userId,
      text: 'Consider reaching out to someone in your village today to strengthen your support network.',
      type: 'village_maintenance',
      context: 'village',
      relevance: 5,
      relatedChatId: null,
      relatedChatTitle: null,
      usedAt: null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date()
    }];
  }
}