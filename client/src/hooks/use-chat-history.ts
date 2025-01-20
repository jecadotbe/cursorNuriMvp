import { useQuery } from "@tanstack/react-query";
import type { Chat, PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";

async function fetchChatHistory(): Promise<Chat[]> {
  const response = await fetch("/api/chats?sort=desc", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch chat history: ${response.status}`);
  }

  return response.json();
}

async function fetchSuggestion(): Promise<PromptSuggestion | null> {
  try {
    const response = await fetch('/api/suggestions', {
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Suggestion fetch error:', error);
    return null;
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
    console.error('Error marking suggestion as used:', error);
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
  } = useQuery<Chat[]>({
    queryKey: ["chats"],
    queryFn: fetchChatHistory,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Suggestion query with proper types and error handling
  const {
    data: suggestion,
    isLoading: isSuggestionLoading,
    error: suggestionError,
    refetch: refetchSuggestion
  } = useQuery<PromptSuggestion | null>({
    queryKey: ["suggestion"],
    queryFn: fetchSuggestion,
    staleTime: 30 * 1000, // 30 seconds cache
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const getLatestPrompt = async () => {
    if (suggestion) {
      return {
        prompt: {
          text: suggestion.text,
          type: suggestion.type,
          context: suggestion.context,
          relatedChatId: suggestion.relatedChatId?.toString() || null,
          relatedChatTitle: suggestion.relatedChatTitle || null,
          suggestionId: suggestion.id
        }
      };
    }
    return null;
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
        description: "Failed to mark suggestion as used. Please try again.",
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