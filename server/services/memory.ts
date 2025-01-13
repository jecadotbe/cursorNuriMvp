import { env } from "process";

if (!process.env.MEM0_API_KEY) {
  throw new Error("MEM0_API_KEY environment variable is required");
}

// Use relative URL to ensure it works in all environments
const MEMORY_SERVICE_URL = '/api/mem0';

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
      console.log('Creating memory with content:', content.substring(0, 100) + '...');
      console.log('Metadata:', JSON.stringify(metadata, null, 2));

      const response = await fetch(`${MEMORY_SERVICE_URL}/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          content,
          metadata: {
            ...metadata,
            source: 'nuri-chat',
            type: 'conversation'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create memory: ${response.status} ${errorText}`);
      }

      const memory = await response.json();
      return {
        ...memory,
        createdAt: new Date(memory.createdAt)
      };
    } catch (error) {
      console.error('Error creating memory:', error);
      throw error;
    }
  }

  async getRelevantMemories(userId: number, currentContext: string): Promise<Memory[]> {
    try {
      console.log('Getting relevant memories for context:', currentContext.substring(0, 100) + '...');

      const response = await fetch(`${MEMORY_SERVICE_URL}/memories/relevant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          context: currentContext,
          metadata: {
            source: 'nuri-chat',
            type: 'conversation'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get relevant memories: ${response.status} ${errorText}`);
      }

      const memories = await response.json();
      return memories.map((memory: any) => ({
        ...memory,
        createdAt: new Date(memory.createdAt)
      }));
    } catch (error) {
      console.error('Error getting relevant memories:', error);
      return [];
    }
  }

  async searchMemories(userId: number, query: string): Promise<Memory[]> {
    try {
      const response = await fetch(`${MEMORY_SERVICE_URL}/memories/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          query,
          metadata: {
            source: 'nuri-chat',
            type: 'conversation'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to search memories: ${response.status} ${errorText}`);
      }

      const memories = await response.json();
      return memories.map((memory: any) => ({
        ...memory,
        createdAt: new Date(memory.createdAt)
      }));
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  async deleteMemory(memoryId: string): Promise<void> {
    try {
      const response = await fetch(`${MEMORY_SERVICE_URL}/memories/${memoryId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete memory: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  }
}

export const memoryService = MemoryService.getInstance();