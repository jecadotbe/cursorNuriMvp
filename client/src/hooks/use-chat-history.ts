import { useQuery } from "@tanstack/react-query";
import type { Chat, PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";
import { useUser } from "./use-user";

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
  const { user, isLoading: isUserLoading } = useUser();

  const { data: chats = [], isLoading: isChatsLoading, error: chatsError, refetch: refetchChats } = useQuery<Chat[], Error>({
    queryKey: ["chats"],
    queryFn: fetchChatHistory,
    enabled: !!user, // Only fetch when user is authenticated
  });

  const { 
    data: suggestion, 
    isLoading: isSuggestionLoading,
    error: suggestionError,
    refetch: refetchSuggestion 
  } = useQuery<PromptSuggestion>({
    queryKey: ["suggestion"],
    queryFn: fetchSuggestion,
    enabled: !!user, // Only fetch when user is authenticated
    retry: false,
    onError: (error) => {
      console.error('Failed to fetch suggestion:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load suggestion",
      });
    },
  });

  const getLatestPrompt = async () => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

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

      // Fallback to default prompt if no suggestion is available
      return {
        prompt: {
          text: "Let's talk about your parenting journey",
          type: "action",
          context: "new"
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
      await refetchSuggestion(); // Fetch a new suggestion after marking the current one as used
    } catch (error) {
      console.error('Failed to mark suggestion as used:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark suggestion as used",
      });
    }
  };

  return {
    chats,
    isLoading: isUserLoading || isChatsLoading || isSuggestionLoading,
    error: chatsError || suggestionError,
    refetch: refetchChats,
    getLatestPrompt,
    markPromptAsUsed,
  };
}