import { Chat, VillageMember, PromptSuggestion, ParentProfile, ChildProfile, ParentingChallenge } from "@db/schema";
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
  memoryService: MemoryService
): Promise<Omit<PromptSuggestion, 'id'>[]> {
  const suggestions: Omit<PromptSuggestion, 'id'>[] = [];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

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

    // 4. Generate suggestions using Claude
    const prompt = `Generate personalized village support network suggestions based on this context:

Village Network Analysis:
- Inner circle members: ${circlesMap.get(1) || 0}
- Support circle members: ${circlesMap.get(2) || 0}
- Extended circle members: ${circlesMap.get(3) || 0}
- Community circle members: ${circlesMap.get(4) || 0}

Recent Conversations: ${chatContext}

Relevant Past Interactions: ${memories.map(m => m.content).join('. ')}

Parent Profile:
- Stress Level: ${context.parentProfile.stress_level}
- Primary Challenges: ${context.challenges.map(c => c.category).join(', ')}

Generate 3 specific, actionable suggestions for strengthening their village network. Each suggestion should:
1. Address a specific gap or opportunity
2. Be concrete and implementable
3. Consider their current stress level and challenges
4. Build on existing relationships where possible

Format each suggestion with:
- Type: "network_growth", "network_expansion", or "village_maintenance"
- Relevance: 1-10 score
- Text: The actual suggestion in natural language
`;

    const response = await anthropic.messages.create({
      messages: [{ role: "user", content: prompt }],
      model: "claude-3-opus-20240229",
      max_tokens: 1000,
      temperature: 0.7
    });

    const suggestionsText = response.content[0].text;
    const parsedSuggestions = suggestionsText.split('\n\n').map(block => {
      const [type, relevanceStr, text] = block.split('\n');
      return {
        userId,
        type: type.toLowerCase().includes('growth') ? 'network_growth' :
              type.toLowerCase().includes('expansion') ? 'network_expansion' : 
              'village_maintenance',
        relevance: parseInt(relevanceStr.match(/\d+/)?.[0] || '5'),
        text: text.trim(),
        context: 'village',
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now
      };
    });

    return parsedSuggestions;

  } catch (error) {
    console.error('Error generating village suggestions:', error);
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