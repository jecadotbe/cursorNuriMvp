import { useQuery } from "@tanstack/react-query";
import type { Chat, PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";

async function fetchChatHistory(): Promise<Chat[]> {
  const response = await fetch("/api/chats?sort=desc", {
    credentials: "include",
  });

  if (!response.ok) {
    console.error('Chat history fetch failed:', await response.text());
    throw new Error(`Failed to fetch chat history: ${response.status}`);
  }

  return response.json();
}

async function fetchSuggestion(): Promise<PromptSuggestion> {
  try {
    const response = await fetch('/api/suggestions', {
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Suggestion fetch failed:', errorText);
      throw new Error(`Failed to fetch suggestion: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Fetched suggestion:', data);
    return data;
  } catch (error) {
    console.error('Suggestion fetch error:', error);
    throw error;
  }
}

async function markSuggestionAsUsed(id: number): Promise<void> {
  const response = await fetch(`/api/suggestions/${id}/use`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    console.error('Mark suggestion as used failed:', await response.text());
    throw new Error(`Failed to mark suggestion as used: ${response.status}`);
  }
}

export function useChatHistory() {
  const { toast } = useToast();

  // Separate chat history query
  const { 
    data: chats = [], 
    isLoading: isChatsLoading, 
    error: chatsError, 
    refetch: refetchChats 
  } = useQuery<Chat[], Error>({
    queryKey: ["chats"],
    queryFn: fetchChatHistory,
    staleTime: 5 * 60 * 1000, // Cache chat history for 5 minutes
  });

  // Independent suggestion query
  const { 
    data: suggestion, 
    isLoading: isSuggestionLoading, 
    error: suggestionError, 
    refetch: refetchSuggestion 
  } = useQuery<PromptSuggestion>({
    queryKey: ["suggestion"],
    queryFn: fetchSuggestion,
    staleTime: 0, // Always fetch fresh suggestions
    retry: 2,
    retryDelay: 1000,
    onError: (error) => {
      console.error('Failed to fetch suggestion:', error);
      toast({
        variant: "destructive",
        title: "Fout bij laden",
        description: "Er ging iets mis bij het laden van je suggestie. Probeer het opnieuw.",
      });
    },
  });

  const getLatestPrompt = async () => {
    try {
      if (suggestion) {
        console.log('Returning suggestion:', suggestion);
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

      console.log('No suggestion available, returning null');
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
    }
  };

  return {
    chats,
    isChatsLoading,
    isSuggestionLoading,
    chatsError,
    suggestionError,
    refetchChats,
    getLatestPrompt,
    markPromptAsUsed,
  };
}