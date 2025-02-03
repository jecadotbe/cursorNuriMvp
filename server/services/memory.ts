import { MemoryClient } from 'mem0ai';

if (!process.env.MEM0_API_KEY) {
  throw new Error("MEM0_API_KEY environment variable is required");
}

// Initialize the memory client according to documentation
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
  private readonly RELEVANCE_THRESHOLD = 0.3; // Lowered threshold to capture onboarding memories
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
      console.log('Content:', content.substring(0, 100) + '...');
      console.log('Metadata:', JSON.stringify(metadata, null, 2));

      // Format message array according to mem0ai docs
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

      const memoryId = Array.isArray(result) ? result[0]?.id : result.id;

      return {
        id: memoryId,
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

  async getRelevantMemories(userId: number, currentContext: string): Promise<Memory[]> {
    try {
      if (!currentContext?.trim()) {
        console.log('[Memory Service] Empty context provided, returning empty array');
        return [];
      }

      console.log(`[Memory Service] Searching memories for user ${userId} with context: "${currentContext.substring(0, 100)}..."`);

      const cacheKey = `relevantMemories:${userId}:${currentContext}`;
      const cachedMemories = await this.getCachedMemories(cacheKey);
      if (cachedMemories) {
        console.log('[Memory Service] Retrieved memories from cache');
        return JSON.parse(cachedMemories);
      }

      console.log('[Memory Service] Fetching memories from mem0ai');

      // First try to get onboarding memories
      const onboardingMemories = await client.search("", {
        user_id: userId.toString(),
        metadata: {
          category: "user_onboarding"
        }
      });

      // Then get conversation memories
      const conversationMemories = await client.search(currentContext, {
        user_id: userId.toString(),
        metadata: {
          category: "chat_history"
        },
        options: {
          limit: 5,
          minRelevance: this.RELEVANCE_THRESHOLD
        }
      });

      // Combine both types of memories
      const memories = [...(onboardingMemories || []), ...(conversationMemories || [])];

      console.log(`[Memory Service] Raw memories response:`, JSON.stringify(memories, null, 2));

      if (!Array.isArray(memories) || memories.length === 0) {
        console.log('[Memory Service] No memories found');
        return [];
      }

      const validMemories = memories
        .filter(memory => 
          memory?.memory || memory?.content
        )
        .map(memory => ({
          id: memory.id,
          content: memory.memory || (Array.isArray(memory.content) ? 
            memory.content[0]?.content : 
            memory.content),
          metadata: memory.metadata,
          createdAt: new Date(memory.created_at || new Date()),
          relevance: memory.score || memory.relevance || 0
        }))
        .filter(memory => memory.content)
        .sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

      console.log(`[Memory Service] Processed ${validMemories.length} valid memories:`, JSON.stringify(validMemories, null, 2));

      await this.cacheMemories(cacheKey, JSON.stringify(validMemories), 60);
      return validMemories;
    } catch (error) {
      console.error('[Memory Service] Error getting relevant memories:', error);
      return [];
    }
  }
}

export const memoryService = MemoryService.getInstance();

export async function addVillageMember(userId: number, memberData: any) {
  try {
    const response = await fetch('/api/village', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...memberData,
        userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to add village member:', error);
      throw new Error(error.message);
    }

    return response.json();
  } catch (error) {
    console.error('Village member creation failed:', error);
    throw error;
  }
}