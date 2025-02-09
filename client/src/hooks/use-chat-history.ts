import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import type { Chat, PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";
import { useUser } from "./use-user";

async function fetchChatHistory(): Promise<Chat[]> {
  const response = await fetch("/api/chats?sort=desc&limit=5", {
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

export function useChatHistory() {
  const { toast } = useToast();
  const { user, isLoading: isUserLoading } = useUser();

  const { data: chats = [], isLoading: isChatsLoading, error: chatsError, refetch: refetchChats } = useQuery<Chat[]>({
    queryKey: ["chats"],
    queryFn: fetchChatHistory,
    enabled: !!user,
    staleTime: 0, // Always refetch to ensure fresh data
    gcTime: 5000, // Keep in cache for 5 seconds
  });

  const getLatestPrompt = async () => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const latestChats = await fetchChatHistory();

      if (latestChats && latestChats.length > 0) {
        // Use latest chat context for prompt
        const latestChat = latestChats[0];
        return {
          prompt: {
            text: `Let's continue our conversation about ${latestChat.title || 'parenting'}`,
            type: "action",
            context: "chat_continuation",
            relatedChatId: latestChat.id
          }
        };
      }

      // Fallback to default prompt
      return {
        prompt: {
          text: "Let's continue our conversation about parenting",
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

  return {
    chats,
    isLoading: isUserLoading || isChatsLoading,
    error: chatsError,
    refetch: refetchChats,
    getLatestPrompt,
  };
}