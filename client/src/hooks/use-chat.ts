import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import type { Chat } from "@db/schema";
import { useLocation } from "wouter";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location] = useLocation();
  const chatIdFromUrl = location.startsWith('/chat/') ? location.split('/')[2] : undefined;

  // Load existing chat messages
  const { data: chatData } = useQuery<Chat>({
    queryKey: chatIdFromUrl ? [`/api/chats/${chatIdFromUrl}`] : ["/api/chats/latest"],
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
      if (chatIdFromUrl) {
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatIdFromUrl}`] });
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
    isLoading: mutation.isPending,
  };
}