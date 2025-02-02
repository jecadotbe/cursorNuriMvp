import { Chat, VillageMember, PromptSuggestion, ParentProfile, ChildProfile, ParentingChallenge } from "@db/schema";
import { VILLAGE_RULES, analyzeVillageGaps } from "./village-rules";
import { MemoryService } from "../services/memory";

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
  memories: any[]; // Memory service response type
}

export async function generateVillageSuggestions(
  userId: number,
  members: VillageMember[],
  context: VillageContext,
  memoryService: MemoryService
): Promise<Omit<PromptSuggestion, 'id'>[]> {
  const suggestions: Omit<PromptSuggestion, 'id'>[] = [];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  try {
    console.log('Starting village suggestion generation for user:', userId);

    // 1. Analyze village structure and gaps
    const gaps = analyzeVillageGaps(members);
    const circlesMap = gaps.circles || new Map();

    // 2. Get recent chat context
    const chatContext = context.recentChats
      .slice(0, 3)
      .flatMap(chat => chat.messages)
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');

    // 3. Get relevant memories
    const memories = await memoryService.getRelevantMemories(userId, chatContext);
    console.log(`Found ${memories.length} relevant memories`);

    // Generate different types of suggestions:

    // A. Network Growth Suggestions (Inner Circle)
    if (circlesMap.get(1) === undefined || circlesMap.get(1) < (VILLAGE_RULES.CIRCLE_MINIMUMS[1] || 3)) {
      suggestions.push({
        userId,
        text: `Based on your village structure, you could benefit from strengthening your inner circle relationships. Consider dedicating more quality time with ${
          members.filter(m => m.circle === 2)[0]?.name || 'someone you trust'
        } to build a deeper connection.`,
        type: 'network_growth',
        context: 'village',
        relevance: 9,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now
      });
    }

    // B. Support Network Expansion (Outer Circle)
    if (circlesMap.get(4) === undefined || circlesMap.get(4) < (VILLAGE_RULES.CIRCLE_MINIMUMS[4] || 5)) {
      const challengeBasedSuggestion = context.challenges.length > 0 
        ? `especially someone with experience in ${context.challenges[0].category}`
        : 'who can offer different perspectives';

      suggestions.push({
        userId,
        text: `Your support network could benefit from more diversity. Consider connecting with other parents ${challengeBasedSuggestion}.`,
        type: 'network_expansion',
        context: 'village',
        relevance: 7,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now
      });
    }

    // C. Child Development Based Suggestions
    context.childProfiles.forEach(child => {
      const childAge = child.age;
      suggestions.push({
        userId,
        text: `For ${child.name}'s development stage (age ${childAge}), consider connecting with parents who have children of similar age. This can provide valuable insights and support.`,
        type: 'village_maintenance',
        context: 'village',
        relevance: 8,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now
      });
    });

    // D. Memory-Based Reconnection Suggestions
    if (memories.length > 0) {
      suggestions.push({
        userId,
        text: 'Recent interactions suggest it might be valuable to reconnect with members of your village who provided support during challenging moments.',
        type: 'village_maintenance',
        context: 'village',
        relevance: 6,
        relatedChatId: context.recentChats[0]?.id || null,
        relatedChatTitle: context.recentChats[0]?.title || null,
        usedAt: null,
        expiresAt,
        createdAt: now
      });
    }

    // E. Stress-Level Based Suggestions
    if (context.parentProfile.stress_level === 'high') {
      suggestions.push({
        userId,
        text: 'Your recent stress levels indicate you might benefit from reaching out to your closest support circle. Consider scheduling a casual meet-up or chat with someone who helps you feel more relaxed.',
        type: 'village_maintenance',
        context: 'village',
        relevance: 9,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now
      });
    }

    // F. Inactive Member Engagement
    const inactiveMembers = members
      .filter(m => m.circle <= 2)
      .slice(0, 2);

    inactiveMembers.forEach(member => {
      suggestions.push({
        userId,
        text: `It's been a while since you connected with ${member.name}. Strong village relationships benefit from regular contact - consider reaching out for a quick check-in.`,
        type: 'village_maintenance',
        context: 'village',
        relevance: 7,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now
      });
    });

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
      expiresAt,
      createdAt: now
    }];
  }
}