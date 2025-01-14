import { useQuery } from "@tanstack/react-query";
import type { Chat } from "@db/schema";
import { useToast } from "./use-toast";

async function fetchChatHistory(): Promise<Chat[]> {
  const response = await fetch("/api/chats", {
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

  const { data: chats = [], isLoading, error, refetch } = useQuery<Chat[], Error>({
    queryKey: ["/api/chats"],
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

  const getLatestPrompt = () => {
    if (chats.length === 0) {
      return {
        title: "Start a conversation",
        message: "Let's talk about your parenting journey",
      };
    }

    const latestChat = chats[0];
    const messages = latestChat.messages as { role: string; content: string }[];
    const lastUserMessage = messages.findLast(m => m.role === "user");

    return {
      title: latestChat.title || "Continue our conversation",
      message: lastUserMessage?.content || "Let's continue our discussion",
    };
  };

  return {
    chats,
    isLoading,
    error,
    refetch,
    getLatestPrompt,
  };
}