import { env } from "process";

if (!process.env.MEM0_API_KEY) {
  throw new Error("MEM0_API_KEY environment variable is required");
}

// Ensure we have a proper base URL that includes protocol and host
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co'
  : 'http://localhost:5000';

const MEMORY_SERVICE_URL = `${BASE_URL}/api/mem0`;

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
      console.log('Memory service URL:', MEMORY_SERVICE_URL);
      console.log('Metadata:', JSON.stringify(metadata, null, 2));

      const url = new URL('/memories', MEMORY_SERVICE_URL);
      const response = await fetch(url, {
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
      console.log('Memory service URL:', MEMORY_SERVICE_URL);

      const url = new URL('/memories/relevant', MEMORY_SERVICE_URL);
      const response = await fetch(url, {
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
      const url = new URL('/memories/search', MEMORY_SERVICE_URL);
      const response = await fetch(url, {
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
      const url = new URL(`/memories/${memoryId}`, MEMORY_SERVICE_URL);
      const response = await fetch(url, {
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