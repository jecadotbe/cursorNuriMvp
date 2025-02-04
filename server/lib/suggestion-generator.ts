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
  console.log('Starting village suggestion generation with context:', {
    userId,
    memberCount: members.length,
    hasParentProfile: !!context.parentProfile,
    chatCount: context.recentChats.length,
    childProfileCount: context.childProfiles.length,
    challengeCount: context.challenges.length
  });

  const suggestions: Omit<PromptSuggestion, 'id'>[] = [];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    // 1. Analyze village structure and gaps
    console.log('Analyzing village gaps for members:', members);
    const gaps = analyzeVillageGaps(members);
    const circlesMap = gaps.circles || new Map();
    console.log('Village analysis results:', {
      gaps,
      circleMembers: Object.fromEntries(circlesMap)
    });

    // 2. Get recent chat context
    const chatContext = context.recentChats
      .slice(0, 3)
      .flatMap(chat => chat.messages)
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');
    console.log('Processed chat context length:', chatContext.length);

    // 3. Get relevant memories
    console.log('Fetching relevant memories for user:', userId);
    const memories = await memoryService.getRelevantMemories(userId, chatContext);
    console.log('Retrieved memory count:', memories.length);

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
- Stress Level: ${context.parentProfile?.stressLevel || 'Unknown'}
- Primary Challenges: ${context.challenges?.map(c => c.category).join(', ') || 'None specified'}

Generate 3 specific, actionable suggestions for strengthening their village network. Format each suggestion as follows:

1. Type: network_growth
Relevance: 8
Suggestion: [Your first suggestion text]

2. Type: network_expansion
Relevance: 7
Suggestion: [Your second suggestion text]

3. Type: village_maintenance
Relevance: 6
Suggestion: [Your third suggestion text]`;

    console.log('Sending prompt to Claude, length:', prompt.length);
    const response = await anthropic.messages.create({
      messages: [{ role: "user", content: prompt }],
      model: "claude-3-opus-20240229",
      max_tokens: 1000,
      temperature: 0.7
    });
    console.log('Received response from Claude');

    if (!response.content || response.content.length === 0) {
      console.error('Invalid response from Claude:', response);
      throw new Error('Invalid response format from Claude');
    }

    const content = response.content[0];
    if (!content || typeof content.text !== 'string') {
      console.error('Invalid content format from Claude:', content);
      throw new Error('Invalid content format from Claude');
    }

    const suggestionsText = content.text;
    console.log('Raw suggestions from Claude:', suggestionsText);

    const suggestionBlocks = suggestionsText.split(/\d+\.\s+/).filter(block => block.trim());
    console.log('Parsed suggestion blocks:', suggestionBlocks.length);

    const parsedSuggestions = suggestionBlocks.map(block => {
      const lines = block.split('\n').filter(line => line.trim());
      console.log('Processing suggestion block:', lines);

      const typeMatch = lines[0].match(/Type:\s*(network_growth|network_expansion|village_maintenance)/i);
      const relevanceMatch = lines[1].match(/Relevance:\s*(\d+)/);
      const suggestionText = lines[2].replace(/^Suggestion:\s*/i, '').trim();

      if (!typeMatch || !relevanceMatch || !suggestionText) {
        console.error('Failed to parse suggestion block:', block);
        return null;
      }

      return {
        userId,
        type: typeMatch[1].toLowerCase(),
        relevance: parseInt(relevanceMatch[1]),
        text: suggestionText,
        context: 'village',
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now
      };
    }).filter((suggestion): suggestion is Omit<PromptSuggestion, 'id'> => suggestion !== null);

    console.log('Successfully parsed suggestions:', parsedSuggestions);
    return parsedSuggestions;

  } catch (error) {
    console.error('Error generating village suggestions:', error);
    // Return a default suggestion if generation fails
    return [{
      userId,
      text: 'Neem contact op met iemand uit je village om je steunnetwerk te versterken.',
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