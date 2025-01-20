import { useQuery } from "@tanstack/react-query";
import type { Chat, PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";

async function fetchChatHistory(): Promise<Chat[]> {
  const response = await fetch("/api/chats?sort=desc", {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function fetchSuggestion(): Promise<PromptSuggestion> {
  const response = await fetch('/api/suggestions', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function markSuggestionAsUsed(id: number): Promise<void> {
  const response = await fetch(`/api/suggestions/${id}/use`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`${response.status}: ${await response.text()}`);
  }
}

export function useChatHistory() {
  const { toast } = useToast();

  const { data: chats = [], isLoading: isChatsLoading, error: chatsError, refetch: refetchChats } = useQuery<Chat[], Error>({
    queryKey: ["chats"],
    queryFn: fetchChatHistory,
  });

  const { data: suggestion, isLoading: isSuggestionLoading, error: suggestionError, refetch: refetchSuggestion } = useQuery<PromptSuggestion>({
    queryKey: ["suggestion"],
    queryFn: fetchSuggestion,
    staleTime: 0, // Always fetch fresh suggestions
    retry: 1,
    onError: (error) => {
      console.error('Failed to fetch suggestion:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load suggestion",
      });
    },
  });

  const isLoading = isChatsLoading || isSuggestionLoading;
  const error = chatsError || suggestionError;

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

      // Return null instead of fallback to show loading state
      return null;
    } catch (error) {
      console.error('Failed to get prompt:', error);
      return null;
    }
  };

  const markPromptAsUsed = async (suggestionId: number) => {
    try {
      await markSuggestionAsUsed(suggestionId);
      await refetchSuggestion(); // Fetch a new suggestion after marking the current one as used
    } catch (error) {
      console.error('Failed to mark suggestion as used:', error);
    }
  };

  return {
    chats,
    isLoading,
    error,
    refetchChats,
    getLatestPrompt,
    markPromptAsUsed,
  };
}