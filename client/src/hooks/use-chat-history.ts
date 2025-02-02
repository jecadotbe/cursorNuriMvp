import { useQuery, UseQueryOptions } from "@tanstack/react-query";
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

export function useChatHistory() {
  const { toast } = useToast();
  const { user, isLoading: isUserLoading } = useUser();

  const { data: chats = [], isLoading: isChatsLoading, error: chatsError, refetch: refetchChats } = useQuery<Chat[]>({
    queryKey: ["chats"],
    queryFn: fetchChatHistory,
    enabled: !!user,
    staleTime: 5000, // Consider data fresh for 5 seconds
  });

  const getLatestPrompt = async () => {
    try {
      if (!user) {
        throw new Error("User not authenticated");
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