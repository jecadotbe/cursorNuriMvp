import { useQuery } from "@tanstack/react-query";
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

async function fetchSuggestion(): Promise<PromptSuggestion> {
  try {
    const response = await fetch('/api/suggestions', {
      credentials: 'include',
    });

    if (!response.ok) {
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

  // Chat history query with proper error handling and caching
  const { 
    data: chats = [], 
    isLoading, 
    error: chatsError,
    refetch: refetchChats 
  } = useQuery({
    queryKey: ["/api/chats"],
    queryFn: fetchChatHistory,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Suggestion query with optimized configuration
  const { 
    data: suggestion, 
    isLoading: isSuggestionLoading,
    error: suggestionError,
    refetch: refetchSuggestion 
  } = useQuery({
    queryKey: ["/api/suggestions"],
    queryFn: fetchSuggestion,
    staleTime: 30 * 1000,     // 30 seconds
    gcTime: 60 * 1000,        // 1 minute
    retry: 1,
    enabled: true,
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error loading suggestions",
        description: "Failed to load suggestions. Please try again later.",
      });
    },
  });

  const getLatestPrompt = async () => {
    try {
      if (suggestion) {
        return {
          prompt: {
            text: suggestion.text,
            type: suggestion.type,
            context: suggestion.context,
            relatedChatId: suggestion.relatedChatId?.toString(),
            relatedChatTitle: suggestion.relatedChatTitle,
            suggestionId: suggestion.id
          }
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get prompt:', error);
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