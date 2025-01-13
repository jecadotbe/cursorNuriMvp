import { env } from "process";
import type { Response } from "express";

if (!process.env.MEM0_API_KEY) {
  throw new Error("MEM0_API_KEY environment variable is required");
}

const BASE_URL = "https://api.mem0.ai/v1";

export interface Memory {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export class MemoryService {
  private static instance: MemoryService;
  private headers: HeadersInit;

  private constructor() {
    this.headers = {
      "Authorization": `Bearer ${process.env.MEM0_API_KEY}`,
      "Content-Type": "application/json",
    };
  }

  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  private async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`${response.statusText}: ${errorText}`);
    }
    return response.json();
  }

  async createMemory(userId: number, content: string, metadata?: Record<string, any>): Promise<Memory> {
    try {
      console.log('Creating memory with content:', content.substring(0, 100) + '...');
      const response = await fetch(`${BASE_URL}/memories`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          content,
          metadata: {
            ...metadata,
            userId: userId.toString(),
            source: 'nuri-chat',
            type: 'conversation'
          }
        })
      });

      const data = await this.handleResponse(response);
      return {
        id: data.id,
        content: data.content,
        metadata: data.metadata,
        createdAt: new Date(data.createdAt)
      };
    } catch (error) {
      console.error('Error creating memory:', error);
      throw new Error('Failed to create memory');
    }
  }

  async getRelevantMemories(userId: number, currentContext: string): Promise<Memory[]> {
    try {
      console.log('Getting relevant memories for context:', currentContext.substring(0, 100) + '...');
      const response = await fetch(`${BASE_URL}/memories/search`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          query: currentContext,
          filter: {
            metadata: {
              userId: userId.toString(),
              source: 'nuri-chat'
            }
          },
          limit: 5
        })
      });

      const data = await this.handleResponse(response);
      return data.memories.map((memory: any) => ({
        id: memory.id,
        content: memory.content,
        metadata: memory.metadata,
        createdAt: new Date(memory.createdAt)
      }));
    } catch (error) {
      console.error('Error getting relevant memories:', error);
      // Return empty array instead of throwing to prevent chat from failing
      return [];
    }
  }

  async searchMemories(userId: number, query: string): Promise<Memory[]> {
    try {
      const response = await fetch(`${BASE_URL}/memories/search`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          query,
          filter: {
            metadata: {
              userId: userId.toString(),
              source: 'nuri-chat'
            }
          }
        })
      });

      const data = await this.handleResponse(response);
      return data.memories.map((memory: any) => ({
        id: memory.id,
        content: memory.content,
        metadata: memory.metadata,
        createdAt: new Date(memory.createdAt)
      }));
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  async deleteMemory(memoryId: string): Promise<void> {
    try {
      const response = await fetch(`${BASE_URL}/memories/${memoryId}`, {
        method: "DELETE",
        headers: this.headers
      });

      await this.handleResponse(response);
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw new Error('Failed to delete memory');
    }
  }
}

export const memoryService = MemoryService.getInstance();