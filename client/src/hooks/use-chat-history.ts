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
  const response = await fetch("/api/chats", {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`${response.status}: ${await response.text()}`);
  }

  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Invalid response format from server');
  }

  return response.json();
}

async function fetchSuggestion(): Promise<SuggestionResponse> {
  const response = await fetch('/api/suggestions', {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export function useChatHistory() {
  const { toast } = useToast();
  const { user, isLoading: isUserLoading } = useUser();

  const { 
    data: chats, 
    isLoading: isChatsLoading, 
    error: chatsError, 
    refetch: refetchChats 
  } = useQuery<ChatResponse[]>({
    queryKey: ["/api/chats"],
    queryFn: fetchChatHistory,
    enabled: !!user?.id,
    retry: 1,
    initialData: [],
  });

  const { 
    data: suggestion, 
    isLoading: isSuggestionLoading,
    error: suggestionError,
    refetch: refetchSuggestion 
  } = useQuery<SuggestionResponse>({
    queryKey: ["/api/suggestions"],
    queryFn: fetchSuggestion,
    enabled: !!user?.id,
    retry: 1,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  const getLatestPrompt = async () => {
    try {
      if (!user?.id) {
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

  return {
    chats: chats ?? [],
    isLoading: isUserLoading || isChatsLoading || isSuggestionLoading,
    error: chatsError || suggestionError,
    refetch: refetchChats,
    getLatestPrompt,
  };
}