import { useQuery } from "@tanstack/react-query";
import type { Chat } from "@db/schema";
import { useToast } from "./use-toast";

async function fetchChatHistory(): Promise<Chat[]> {
  try {
    const response = await fetch("/api/chats?sort=desc", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch chat history: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Chat history fetch failed:', error);
    throw error;
  }
}

export function useChatHistory() {
  const { toast } = useToast();

  // Chat history query with optimized caching and error handling
  const { 
    data: chats = [], 
    isLoading, 
    error: chatsError,
    refetch: refetchChats 
  } = useQuery({
    queryKey: ["/api/chats"],
    queryFn: fetchChatHistory,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,    // 5 minutes
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

  return {
    chats,
    isLoading,
    chatsError,
    refetchChats,
  };
}