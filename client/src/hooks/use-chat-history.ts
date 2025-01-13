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
  
  const { data: chats = [], isLoading, error } = useQuery<Chat[], Error>({
    queryKey: ["chats"],
    queryFn: fetchChatHistory,
    staleTime: Infinity,
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
        title: "LATEN WE BEGINNEN",
        message: "Laten we praten over jouw uitdagingen!",
      };
    }

    const latestChat = chats[chats.length - 1];
    const messages = latestChat.messages as { role: string; content: string }[];
    const lastUserMessage = messages.findLast(m => m.role === "user");

    return {
      title: "OP BASIS VAN ONS GESPREK",
      message: lastUserMessage?.content || "Laten we verder praten over jouw uitdagingen!",
    };
  };

  return {
    chats,
    isLoading,
    error,
    getLatestPrompt,
  };
}
