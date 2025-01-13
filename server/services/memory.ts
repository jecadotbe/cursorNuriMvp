import { env } from "process";
import MemoryClient from 'mem0ai';

if (!process.env.MEM0_API_KEY) {
  throw new Error("MEM0_API_KEY environment variable is required");
}

const client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });

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

      // Format messages for mem0ai
      const messages = [];

      // Add previous context as system message if available
      if (metadata?.conversationContext) {
        messages.push({
          role: "system",
          content: `Previous conversation context:\n${metadata.conversationContext}`
        });
      }

      // Add the current message
      messages.push({
        role: metadata?.role || "user",
        content: content
      });

      console.log('Formatted messages for mem0ai:', JSON.stringify(messages, null, 2));

      // Add memory using the SDK
      const memory = await client.add(messages, {
        user_id: userId.toString(),
        metadata: {
          ...metadata,
          source: 'nuri-chat',
          type: 'conversation'
        }
      });

      return {
        id: memory.id,
        content,
        metadata: memory.metadata,
        createdAt: new Date(memory.created_at)
      };
    } catch (error) {
      console.error('Error creating memory:', error);
      throw error;
    }
  }

  async getRelevantMemories(userId: number, currentContext: string): Promise<Memory[]> {
    try {
      console.log('Getting relevant memories for context:', currentContext.substring(0, 100) + '...');

      // Search for relevant memories using the SDK
      const memories = await client.search(currentContext, {
        user_id: userId.toString(),
        limit: 5,
        metadata: {
          source: 'nuri-chat',
          type: 'conversation'
        }
      });

      console.log('Found memories:', memories);

      return memories.map(memory => ({
        id: memory.id,
        content: memory.content,
        metadata: memory.metadata,
        createdAt: new Date(memory.created_at)
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
          type: 'conversation'
        }
      });

      return memories.map(memory => ({
        id: memory.id,
        content: memory.content,
        metadata: memory.metadata,
        createdAt: new Date(memory.created_at)
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