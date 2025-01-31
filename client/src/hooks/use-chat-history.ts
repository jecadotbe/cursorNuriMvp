import { useQuery } from "@tanstack/react-query";
import type { Chat, PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";
import { useUser } from "./use-user";

interface ChatResponse extends Chat {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

interface SuggestionResponse extends PromptSuggestion {
  id: number;
  text: string;
  type: string;
  context: string;
  related_chat_id?: number;
  related_chat_title?: string;
}

async function fetchChatHistory(): Promise<ChatResponse[]> {
  const response = await fetch("/api/chats?sort=desc", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function fetchSuggestion(): Promise<SuggestionResponse> {
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

  const { data: chats = [], isLoading: isChatsLoading, error: chatsError, refetch: refetchChats } = useQuery<ChatResponse[]>({
    queryKey: ["chats"],
    queryFn: fetchChatHistory,
    enabled: !!user,
  });

  const { 
    data: suggestion, 
    isLoading: isSuggestionLoading,
    error: suggestionError,
    refetch: refetchSuggestion 
  } = useQuery<SuggestionResponse>({
    queryKey: ["suggestion"],
    queryFn: fetchSuggestion,
    enabled: !!user,
    retry: false,
    onError: (error: Error) => {
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
            relatedChatId: suggestion.related_chat_id?.toString(),
            relatedChatTitle: suggestion.related_chat_title,
            suggestionId: suggestion.id
          }
        };
      }

      return {
        prompt: {
          text: "Let's talk about your parenting journey",
          type: "action",
          context: "new"
        }
      };
    } catch (error) {
      console.error('Failed to get prompt:', error);
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
      await refetchSuggestion();
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