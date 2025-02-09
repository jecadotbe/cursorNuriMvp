import { MemoryClient } from 'mem0ai';

if (!process.env.MEM0_API_KEY) {
  throw new Error("MEM0_API_KEY environment variable is required");
}

const client = new MemoryClient({ 
  apiKey: process.env.MEM0_API_KEY,
});

export interface Memory {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  relevance?: number;
}

export class MemoryService {
  private static instance: MemoryService;
  private readonly CHAT_RELEVANCE_THRESHOLD = 0.15;
  private readonly SUGGESTION_RELEVANCE_THRESHOLD = 0.3;
  private memoryCache: Map<string, {value: string, expires: number}> = new Map();

  private constructor() {}

  async getCachedMemories(key: string): Promise<string | null> {
    const cached = this.memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    return null;
  }

  async cacheMemories(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.memoryCache.set(key, {
      value,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }

  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  async createMemory(userId: number, content: string, metadata?: Record<string, any>): Promise<Memory> {
    try {
      console.log('Creating memory for user:', userId);
      console.log('Content:', content);
      console.log('Metadata:', JSON.stringify(metadata, null, 2));

      const messages = [{
        role: metadata?.role || "user",
        content: content
      }];

      console.log('Adding memory with messages:', JSON.stringify(messages, null, 2));

      const result = await client.add(messages, {
        user_id: userId.toString(),
        metadata: {
          ...metadata,
          source: metadata?.source || 'nuri-chat',
          type: metadata?.type || 'conversation',
          category: metadata?.category || 'chat_history',
          timestamp: new Date().toISOString()
        }
      });

      console.log('Memory creation result:', result);

      return {
        id: Array.isArray(result) ? result[0]?.id : result.id,
        content,
        metadata: {
          ...metadata,
          source: metadata?.source || 'nuri-chat',
          type: metadata?.type || 'conversation',
          category: metadata?.category || 'chat_history'
        },
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating memory:', error);
      throw error;
    }
  }

  async getRelevantMemories(userId: number, currentContext: string, type: 'chat' | 'suggestion' = 'chat'): Promise<Memory[]> {
    try {
      // Always search for recent memories even if context is empty
      const searchContext = currentContext?.trim() || "recent conversations parenting children family";
      console.log(`[Memory Service] Searching memories for user ${userId} with context: "${searchContext.substring(0, 100)}..."`);
      console.log(`[Memory Service] Search type: ${type}`);

      const threshold = type === 'chat' ? this.CHAT_RELEVANCE_THRESHOLD : this.SUGGESTION_RELEVANCE_THRESHOLD;

      // Get recent chat history first
      const recentChatMemories = await client.search(searchContext, {
        user_id: userId.toString(),
        metadata: {
          category: "chat_history",
          type: "conversation"
        },
        limit: type === 'chat' ? 10 : 5,
        min_relevance: threshold
      });

      // Then get onboarding memories for context
      const onboardingMemories = await client.search("profile children parents family onboarding", {
        user_id: userId.toString(),
        metadata: {
          category: "user_onboarding"
        },
        limit: 5,
        min_relevance: threshold / 2
      });

      // Combine both types of memories
      const memories = [...(recentChatMemories || []), ...(onboardingMemories || [])];

      console.log(`[Memory Service] Raw memories response:`, JSON.stringify(memories, null, 2));

      if (!memories || memories.length === 0) {
        console.log('[Memory Service] No memories found');
        return [];
      }

      const validMemories = memories
        .filter(memory => memory?.content || memory?.memory)
        .map(memory => ({
          id: memory.id,
          content: memory.content?.[0]?.content || memory.memory || memory.content,
          metadata: memory.metadata,
          createdAt: new Date(memory.created_at || memory.timestamp || new Date()),
          relevance: memory.score || memory.relevance || 0
        }))
        .filter(memory => memory.content && typeof memory.content === 'string')
        .sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

      console.log(`[Memory Service] Processed ${validMemories.length} valid memories:`, 
        JSON.stringify(validMemories.map(m => ({ 
          content: m.content.substring(0, 100), 
          relevance: m.relevance 
        })), null, 2));

      await this.cacheMemories(cacheKey, JSON.stringify(validMemories), 60);
      return validMemories;
    } catch (error) {
      console.error('[Memory Service] Error getting relevant memories:', error);
      return [];
    }
  }
}

export const memoryService = MemoryService.getInstance();