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
    const lastAssistantMessage = messages.findLast(m => m.role === "assistant");
    
    // If we have an assistant response, suggest continuing that thread
    if (lastAssistantMessage?.content) {
      const topic = lastAssistantMessage.content.split('.')[0]; // Get first sentence
      return {
        title: "OP BASIS VAN ONS GESPREK",
        message: `${topic.toLowerCase()}?`,
      };
    }

    return {
      title: latestChat.title || "VERDER GAAN WAAR WE GESTOPT WAREN",
      message: lastUserMessage?.content || "prompt 2",
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