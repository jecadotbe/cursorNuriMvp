import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import type { Chat } from "@db/schema";
import { useParams, useLocation } from "wouter";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  id: number;
  messages: Message[];
  title: string;
  content: string;
}

export function useChat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const params = useParams();
  const chatId = params?.id;
  const [, navigate] = useLocation();

  // Load existing chat messages or latest chat if no ID is provided
  const { data: chatData, isLoading: isChatLoading } = useQuery<ChatResponse>({
    queryKey: chatId ? [`/api/chats/${chatId}`] : ["/api/chats/latest"],
    retry: (failureCount, error: any) => {
      // Only retry on network errors, not on 404s or other API errors
      return failureCount < 3 && error?.message?.includes('network');
    },
    staleTime: 5000, // Consider data fresh for 5 seconds
    gcTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  // Maintain local messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize messages when chatData changes
  useEffect(() => {
    if (chatData?.messages) {
      setMessages(chatData.messages);
    } else if (!chatId && !isChatLoading) {
      // Only reset messages if we're in a new chat and not loading
      setMessages([]);
    }
  }, [chatData, chatId, isChatLoading]);

  // Invalidate all relevant queries
  const invalidateQueries = useCallback(() => {
    if (chatId) {
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}`] });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/chats/latest"] });
  }, [chatId, queryClient]);

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const userMessage: Message = { role: "user", content };

      // Update messages immediately for better UX
      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            chatId: chatData?.id
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

        // Update messages with assistant's response
        setMessages((prev) => [...prev, assistantMessage]);
        invalidateQueries();

        return chatResponse.content;
      } finally {
        setIsProcessing(false);
      }
    },
    onError: (error: Error) => {
      // Remove the last message on error to maintain consistency
      setMessages((prev) => prev.slice(0, -1));
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
      });
      setIsProcessing(false);
    },
  });

  return {
    messages,
    chatId: chatData?.id,
    sendMessage: mutation.mutateAsync,
    isLoading: mutation.isPending || isChatLoading || isProcessing,
    refreshMessages: invalidateQueries,
  };
}

import { useVillageMemories } from './use-village-memories';

// Add memory context to chat messages
const getMemoryContext = async (memberId: number) => {
  const { memories } = useVillageMemories(memberId);
  return memories.map(m => ({
    content: m.content,
    date: m.date,
    impact: m.emotionalImpact,
    tags: m.tags
  }));
};