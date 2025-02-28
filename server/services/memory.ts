import { MemoryClient } from 'mem0ai';

// Additional debug information
console.log("Memory service initializing...");
console.log("MEM0_API_KEY exists:", !!process.env.MEM0_API_KEY);
console.log("MEM0_API_KEY length:", process.env.MEM0_API_KEY ? process.env.MEM0_API_KEY.length : 0);

// Initialize client only if API key is available
let client: any = null;
try {
  if (process.env.MEM0_API_KEY) {
    console.log("Attempting to create MemoryClient with API key...");
    client = new MemoryClient({ 
      apiKey: process.env.MEM0_API_KEY,
    });
    console.log("Memory client initialized successfully");
  } else {
    console.warn("MEM0_API_KEY environment variable is missing - memory features will be disabled");
  }
} catch (error) {
  console.error("Failed to initialize memory client:", error);
}

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
      
      // Check if memory client is available
      if (!client) {
        console.warn('Memory client not available - skipping memory creation');
        return {
          id: `local-${Date.now()}`,
          content,
          metadata: {
            ...metadata,
            source: metadata?.source || 'nuri-chat',
            type: metadata?.type || 'conversation',
            category: metadata?.category || 'chat_history'
          },
          createdAt: new Date()
        };
      }

      console.log('Content:', content);
      console.log('Metadata:', JSON.stringify(metadata, null, 2));

      const messages = [{
        role: metadata?.role || "user",
        content: content
      }];

      console.log('Adding memory with messages:', JSON.stringify(messages, null, 2));
      console.log('Adding for user_id:', userId.toString());

      try {
        console.log('Calling client.add with params:');
        console.log('- Messages:', JSON.stringify(messages));
        console.log('- Options:', JSON.stringify({
          user_id: userId.toString(),
          metadata: {
            ...metadata,
            source: metadata?.source || 'nuri-chat',
            type: metadata?.type || 'conversation',
            category: metadata?.category || 'chat_history',
            timestamp: new Date().toISOString()
          }
        }, null, 2));
        
        // Try to access the add method directly to see if it's available
        console.log('client.add exists:', typeof client.add === 'function');
        
        // Let's check the client object structure
        console.log('Client object keys:', Object.keys(client));

        // Check API documentation parameters for mem0ai client
        console.log('Testing MemoryClient for proper initialization...');
        
        // Test create method directly according to mem0 API documentation
        // This follows the structure in https://docs.mem0.ai/platform/quickstart
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
      } catch (memoryError) {
        console.error('Error adding memory to mem0ai:', memoryError);
        console.error('Error details:', JSON.stringify(memoryError, Object.getOwnPropertyNames(memoryError), 2));
        console.error('Error stack:', memoryError?.stack);
        
        // Return a local memory object instead of failing
        return {
          id: `local-${Date.now()}`,
          content,
          metadata: {
            ...metadata,
            source: metadata?.source || 'nuri-chat',
            type: metadata?.type || 'conversation',
            category: metadata?.category || 'chat_history',
            error: String(memoryError)
          },
          createdAt: new Date()
        };
      }
    } catch (error) {
      console.error('Error creating memory:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error('Error stack:', error?.stack);
      
      // Instead of throwing, return a local memory object
      return {
        id: `local-error-${Date.now()}`,
        content,
        metadata: {
          ...metadata,
          source: metadata?.source || 'nuri-chat',
          type: metadata?.type || 'conversation',
          category: metadata?.category || 'chat_history',
          error: String(error)
        },
        createdAt: new Date()
      };
    }
  }

  async getRelevantMemories(userId: number, currentContext: string, type: 'chat' | 'suggestion' = 'chat'): Promise<Memory[]> {
    try {
      // Always search for recent memories even if context is empty
      const searchContext = currentContext?.trim() || "recent conversations parenting children family";
      console.log(`[Memory Service] Searching memories for user ${userId} with context: "${searchContext.substring(0, 100)}..."`);
      console.log(`[Memory Service] Search type: ${type}`);

      // Check if memory client is available
      if (!client) {
        console.warn('[Memory Service] Memory client not available - returning empty memory list');
        return [];
      }

      const threshold = type === 'chat' ? this.CHAT_RELEVANCE_THRESHOLD : this.SUGGESTION_RELEVANCE_THRESHOLD;

      // Generate a cache key based on userId and searchContext
      const cacheKey = `memories_${userId}_${Buffer.from(searchContext).toString('base64')}`;

      // Check cache first
      const cachedResult = await this.getCachedMemories(cacheKey);
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }

      try {
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

        // Cache the results
        await this.cacheMemories(cacheKey, JSON.stringify(validMemories), 60);
        return validMemories;
      } catch (memoryError) {
        console.error('[Memory Service] Error searching memories:', memoryError);
        return [];
      }
    } catch (error) {
      console.error('[Memory Service] Error getting relevant memories:', error);
      return [];
    }
  }
}

export const memoryService = MemoryService.getInstance();