import { env } from "process";
import MemoryClient from 'mem0ai';

if (!process.env.MEM0_API_KEY) {
  throw new Error("MEM0_API_KEY environment variable is required");
}

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is required");
}

const config = {
  llm: {
    provider: "anthropic",
    config: {
      model: "claude-3-5-sonnet-20241022", // Using latest model
      temperature: 0.1,
      max_tokens: 2000,
    }
  }
};

const client = new MemoryClient({ 
  apiKey: process.env.MEM0_API_KEY,
  config: config
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

      // Add memory using the SDK with metadata categories
      const memory = await client.add(messages, {
        user_id: userId.toString(),
        metadata: {
          ...metadata,
          source: 'nuri-chat',
          type: 'conversation',
          category: 'chat_history'
        }
      });

      return {
        id: memory.id,
        content: memory.content,
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

      // Search for relevant memories using the SDK with category filter
      const memories = await client.search(currentContext, {
        user_id: userId.toString(),
        limit: 5,
        metadata: {
          source: 'nuri-chat',
          type: 'conversation',
          category: 'chat_history'
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
          type: 'conversation',
          category: 'chat_history'
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