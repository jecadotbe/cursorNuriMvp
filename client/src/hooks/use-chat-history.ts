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

  const { data: chats = [], isLoading, error, refetch } = useQuery<Chat[], Error>({
    queryKey: ["chats"],
    queryFn: fetchChatHistory,
    staleTime: 0, // Always fetch fresh data
    retry: false,
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const { data: cachedSuggestion, refetch: refetchSuggestion } = useQuery<PromptSuggestion>({
    queryKey: ["suggestion"],
    queryFn: fetchSuggestion,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
    enabled: false, // Don't fetch automatically
  });

  const getLatestPrompt = async () => {
    try {
      // Try to get a cached suggestion
      const { data: suggestion } = await refetchSuggestion();

      if (suggestion) {
        return {
          prompt: {
            text: suggestion.text,
            type: suggestion.type,
            context: suggestion.context,
            relatedChatId: suggestion.relatedChatId,
            relatedChatTitle: suggestion.relatedChatTitle,
            suggestionId: suggestion.id // Keep track of the suggestion ID
          }
        };
      }

      // Fallback to default prompt if no suggestion is available
      return {
        prompt: {
          text: "Let's talk about your parenting journey",
          type: "action",
          context: "Start a conversation"
        }
      };
    } catch (error) {
      console.error('Failed to get prompt:', error);
      // Provide a safe fallback
      return {
        prompt: {
          text: "Let's continue our conversation about parenting",
          type: "action",
          context: "new"
        }
      };
    }
  };

  const markPromptAsUsed = async (suggestionId: number) => {
    try {
      await markSuggestionAsUsed(suggestionId);
    } catch (error) {
      console.error('Failed to mark suggestion as used:', error);
    }
  };

  return {
    chats,
    isLoading,
    error,
    refetch,
    getLatestPrompt,
    markPromptAsUsed,
  };
}