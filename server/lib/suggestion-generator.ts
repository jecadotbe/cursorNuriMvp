import { Chat, VillageMember, PromptSuggestion } from "@db/schema";
import { VILLAGE_RULES, analyzeVillageGaps } from "./village-rules";
import { MemoryService } from "../services/memory";
import { 
  getPatternForUser, 
  getStructureForUser, 
  getPatternPrompt, 
  getStructurePrompt,
  ResponsePattern,
  ResponseStructure,
  RESPONSE_PATTERNS,
  RESPONSE_STRUCTURES
} from "./response-patterns";

interface Message {
  content: string;
  role: string;
}

interface SuggestionContext {
  userId: number;
  members?: VillageMember[];
  recentChats?: Chat[];
  communicationPreference?: string;
  memoryService: MemoryService;
  timeOfDay?: string;
  previousSuggestions?: PromptSuggestion[];
}

interface GeneratedSuggestion {
  type: 'action' | 'reflection' | 'follow_up' | 'network_growth';
  priority: 'high' | 'medium' | 'low';
  text: string;
  context?: string;
  pattern: ResponsePattern;
  structure: ResponseStructure;
}

export async function generateDynamicSuggestions(
  context: SuggestionContext
): Promise<GeneratedSuggestion[]> {
  const suggestions: GeneratedSuggestion[] = [];
  const timeBasedContext = getTimeBasedContext(context.timeOfDay);

  // Get context from recent chats if available
  const chatContext = context.recentChats?.map(chat => chat.messages)
    .flat()
    .filter((msg: any): msg is Message => 
      typeof msg.content === 'string' && (
        msg.content.toLowerCase().includes('support') ||
        msg.content.toLowerCase().includes('help') ||
        msg.content.toLowerCase().includes('relationship')
      )
    ) || [];

  // Get relevant memories
  const memories = await context.memoryService.getRelevantMemories(
    context.userId,
    chatContext.map(msg => msg.content).join(' ')
  );

  // Add variety through different suggestion types
  const suggestionTypes = ['action', 'reflection', 'follow_up', 'network_growth'] as const;
  const usedPatterns = new Set<string>();

  for (const type of suggestionTypes) {
    // Get a unique pattern and structure for each suggestion
    const pattern = getPatternForUser(context.communicationPreference || 'supportive');
    if (usedPatterns.has(pattern)) continue;
    usedPatterns.add(pattern);

    const structure = getStructureForUser(context.communicationPreference || 'supportive');

    // Generate suggestion based on type
    const suggestion = await generateTypedSuggestion(
      type,
      {
        pattern,
        structure,
        timeContext: timeBasedContext,
        memories,
        villageMembers: context.members
      }
    );

    if (suggestion) {
      suggestions.push({
        ...suggestion,
        pattern,
        structure
      });
    }
  }

  // Sort by priority and limit to 3 suggestions
  return suggestions
    .sort((a, b) => getPriorityValue(b.priority) - getPriorityValue(a.priority))
    .slice(0, 3);
}

function getPriorityValue(priority: string): number {
  const priorities = { high: 3, medium: 2, low: 1 };
  return priorities[priority as keyof typeof priorities] || 0;
}

function getTimeBasedContext(timeOfDay?: string): string {
  const hour = timeOfDay ? parseInt(timeOfDay.split(':')[0]) : new Date().getHours();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

async function generateTypedSuggestion(
  type: GeneratedSuggestion['type'],
  context: {
    pattern: ResponsePattern;
    structure: ResponseStructure;
    timeContext: string;
    memories: any[];
    villageMembers?: VillageMember[];
  }
): Promise<Omit<GeneratedSuggestion, 'pattern' | 'structure'> | null> {
  const patternPrompt = getPatternPrompt(context.pattern);
  const structurePrompt = getStructurePrompt(context.structure);

  switch (type) {
    case 'action':
      return {
        type: 'action',
        priority: 'high',
        text: `Laten we vandaag ${context.timeContext === 'morning' ? 'beginnen' : 'verder gaan'} met een concrete stap. ${patternPrompt}`,
        context: structurePrompt
      };

    case 'reflection':
      return {
        type: 'reflection',
        priority: 'medium',
        text: `Even een moment van reflectie. ${patternPrompt}`,
        context: structurePrompt
      };

    case 'follow_up':
      const relevantMemory = context.memories[0]?.content;
      return relevantMemory ? {
        type: 'follow_up',
        priority: 'medium',
        text: `Ik herinner me dat we het hadden over ${relevantMemory.substring(0, 50)}... ${patternPrompt}`,
        context: structurePrompt
      } : null;

    case 'network_growth':
      if (context.villageMembers && context.villageMembers.length < 5) {
        return {
          type: 'network_growth',
          priority: 'high',
          text: `Je netwerk versterken kan je helpen. ${patternPrompt}`,
          context: structurePrompt
        };
      }
      return null;

    default:
      return null;
  }
}