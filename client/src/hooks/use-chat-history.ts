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

  const getLatestPrompt = async () => {
    if (chats.length === 0) {
      return {
        prompts: [{
          text: "Let's talk about your parenting journey",
          type: "action",
          relevance: 1,
          context: "Start your first conversation"
        }]
      };
    }

    const latestChat = chats[0];
    const messages = latestChat.messages as { role: string; content: string }[];
    
    try {
      const response = await fetch('/api/analyze-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages })
      });
      
      if (!response.ok) throw new Error('Failed to analyze context');
      return await response.json();
    } catch (error) {
      console.error('Failed to get prompts:', error);
      return {
        prompts: [{
          text: messages[messages.length - 1]?.content?.split('.')[0] || "Continue our conversation",
          type: "follow_up",
          relevance: 1,
          context: "Based on our last conversation"
        }]
      };
    }
  };

  return {
    chats,
    isLoading,
    error,
    refetch,
    getLatestPrompt,
  };
}