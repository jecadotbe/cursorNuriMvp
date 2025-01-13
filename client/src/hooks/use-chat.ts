import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import type { Chat } from "@db/schema";
import { useParams, useLocation } from "wouter";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const params = useParams();
  const chatId = params?.id;

  // Load existing chat messages
  const { data: chatData, isLoading: isChatLoading } = useQuery<Chat>({
    queryKey: chatId ? [`/api/chats/${chatId}`] : ["/api/chats/latest"],
    enabled: !!chatId, // Only fetch if we have a chatId
    retry: false,
  });

  const [messages, setMessages] = useState<Message[]>([]);

  // Initialize messages when chatData changes
  useEffect(() => {
    if (chatData?.messages) {
      setMessages(chatData.messages as Message[]);
    }
  }, [chatData]);

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const userMessage: Message = { role: "user", content };
      setMessages((prev) => [...prev, userMessage]);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({
            role,
            content,
          })),
          chatId: chatData?.id // Include chat ID if this is an existing chat
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const chatResponse = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: chatResponse.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Invalidate chat queries to reload the latest chat
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats/latest"] });
      if (chatId) {
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}`] });
      }

      return chatResponse.content;
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  return {
    messages,
    chatId: chatData?.id,
    sendMessage: mutation.mutateAsync,
    isLoading: mutation.isPending || isChatLoading,
  };
}