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
}

export class MemoryService {
  private static instance: MemoryService;

  private constructor() {}

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
          category: metadata?.category || 'chat_history'
        }
      });

      console.log('Memory creation result:', result);

      // According to mem0ai docs, result is an array of memories
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
      console.log('Getting relevant memories for context:', currentContext.substring(0, 100) + '...');

      // Search for memories using mem0ai search API
      const memories = await client.search(currentContext, {
        user_id: userId.toString(),
        metadata: {
          source: 'nuri-chat',
          type: 'conversation',
          category: 'chat_history'
        }
      });

      console.log('Found memories:', memories.length);

      return memories.map(memory => ({
        id: memory.id,
        content: Array.isArray(memory.content) ? 
          memory.content[0].content : 
          (memory.memory || memory.content),
        metadata: memory.metadata,
        createdAt: new Date(memory.created_at || new Date())
      }));
    } catch (error) {
      console.error('Error getting relevant memories:', error);
      return [];
    }
  }

  async searchMemories(userId: number, query: string): Promise<Memory[]> {
    try {
      const memories = await client.search(query, {
        user_id: userId.toString(),
        metadata: {
          source: 'nuri-chat',
          type: 'conversation',
          category: 'chat_history'
        }
      });

      return memories.map(memory => ({
        id: memory.id,
        content: Array.isArray(memory.content) ? 
          memory.content[0].content : 
          (memory.memory || memory.content),
        metadata: memory.metadata,
        createdAt: new Date(memory.created_at || new Date())
      }));
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  async deleteMemory(memoryId: string): Promise<void> {
    try {
      await client.delete(memoryId);
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
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