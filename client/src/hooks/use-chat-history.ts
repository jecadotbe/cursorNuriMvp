import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { Chat, PromptSuggestion } from "@db/schema";
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

async function fetchSuggestion(): Promise<PromptSuggestion | null> {
  try {
    const response = await fetch('/api/suggestions', {
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch suggestion: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Suggestion fetch failed:', error);
    throw error;
  }
}

async function markSuggestionAsUsed(id: number): Promise<void> {
  try {
    const response = await fetch(`/api/suggestions/${id}/use`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to mark suggestion as used: ${response.status}`);
    }
  } catch (error) {
    console.error('Mark suggestion as used failed:', error);
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

  // Suggestion query with optimized configuration
  const suggestionQueryOptions: UseQueryOptions<PromptSuggestion | null, Error> = {
    queryKey: ["/api/suggestions"],
    queryFn: fetchSuggestion,
    staleTime: 15 * 1000,     // 15 seconds
    gcTime: 30 * 1000,        // 30 seconds
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  };

  const { 
    data: suggestion, 
    isLoading: isSuggestionLoading,
    error: suggestionError,
    refetch: refetchSuggestion 
  } = useQuery(suggestionQueryOptions);

  const getLatestPrompt = async () => {
    try {
      if (suggestion) {
        return {
          prompt: {
            text: suggestion.text,
            type: suggestion.type,
            context: suggestion.context,
            relatedChatId: suggestion.relatedChatId?.toString(),
            relatedChatTitle: suggestion.relatedChatTitle ?? undefined,
            suggestionId: suggestion.id
          }
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get prompt:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load the latest prompt"
      });
      return null;
    }
  };

  const markPromptAsUsed = async (suggestionId: number) => {
    try {
      await markSuggestionAsUsed(suggestionId);
      await refetchSuggestion();
    } catch (error) {
      console.error('Failed to mark suggestion as used:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark suggestion as used.",
      });
    }
  };

  return {
    chats,
    isLoading,
    isSuggestionLoading,
    chatsError,
    suggestionError,
    refetchChats,
    getLatestPrompt,
    markPromptAsUsed,
  };
}