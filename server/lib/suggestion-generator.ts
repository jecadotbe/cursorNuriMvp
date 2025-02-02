import { Chat, VillageMember, PromptSuggestion } from "@db/schema";
import { VILLAGE_RULES, analyzeVillageGaps } from "./village-rules";
import { MemoryService } from "../services/memory";
import { anthropic } from "../anthropic";

interface Message {
  content: string;
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

  // Get context from recent chats and members
  const recentMessages = recentChats
    .slice(0, 2)
    .flatMap(chat => chat.messages)
    .slice(-5);

  const chatContext = recentMessages
    .map(msg => msg.content)
    .join(' ');

  // Format member context
  const memberContext = members
    .map(m => `${m.name} (${m.type}, circle ${m.circle})`)
    .join(', ');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Generate AI-driven suggestions using Anthropic
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      temperature: 0.7,
      system: `Generate personalized village network suggestions based on the following context:
        - User's village members: ${memberContext}
        - Recent chat context: ${chatContext}
        - Network gaps: Inner circle (${gaps.circles?.get(1) || 0}/${VILLAGE_RULES.CIRCLE_MINIMUMS[1]})

        Generate 3-4 specific, actionable suggestions that help:
        1. Maintain existing relationships
        2. Strengthen connections to move members closer
        3. Expand the network thoughtfully

        Each suggestion should be practical and contextual.`,
      messages: [{
        role: "user",
        content: "Generate village network suggestions based on the provided context."
      }]
    });

    if (response.content[0].type === "text") {
      // Parse and format AI suggestions
      const aiSuggestions = response.content[0].text
        .split('\n')
        .filter(s => s.trim())
        .map(s => s.replace(/^\d+\.\s*/, '').trim())
        .filter(s => s.length > 0)
        .map(text => {
          const type = text.toLowerCase().includes('expand') ? 'network_expansion' :
                      text.toLowerCase().includes('strengthen') ? 'network_growth' :
                      'village_maintenance';

          return {
            userId,
            text,
            type,
            context: 'AI-generated based on your village context',
            relevance: 8,
            relatedChatId: null,
            relatedChatTitle: null,
            usedAt: null,
            expiresAt,
            createdAt: now
          };
        });

      suggestions.push(...aiSuggestions);
    }
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    // Fallback to basic suggestions if AI generation fails
    if (gaps.circles?.get(1) < VILLAGE_RULES.CIRCLE_MINIMUMS[1]) {
      suggestions.push({
        userId,
        text: 'Consider strengthening existing relationships to move them to your inner circle',
        type: 'network_growth',
        context: 'Based on your village structure',
        relevance: 8,
        relatedChatId: null,
        relatedChatTitle: null,
        usedAt: null,
        expiresAt,
        createdAt: now
      });
    }
  }

  // Ensure at least two suggestions
  if (suggestions.length < 2) {
    suggestions.push({
      userId,
      text: 'Regular check-ins help maintain strong connections. Consider reaching out to a village member this week.',
      type: 'village_maintenance',
      context: 'Maintaining healthy relationships',
      relevance: 5,
      relatedChatId: null,
      relatedChatTitle: null,
      usedAt: null,
      expiresAt,
      createdAt: now
    });
  }

  return suggestions.sort((a, b) => b.relevance - a.relevance);
}