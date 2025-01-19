import { useState, useEffect, useCallback } from "react";
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
  const [, navigate] = useLocation();

  // Load existing chat messages or latest chat if no ID is provided
  const { data: chatData, isLoading: isChatLoading } = useQuery<Chat>({
    queryKey: chatId ? [`/api/chats/${chatId}`] : ["/api/chats/latest"],
    retry: (failureCount, error: any) => {
      // Only retry on network errors, not on 404s or other API errors
      return failureCount < 3 && error?.message?.includes('network');
    },
    staleTime: 5000, // Consider data fresh for 5 seconds
    cacheTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  // Maintain local messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize messages when chatData changes
  useEffect(() => {
    if (chatData?.messages) {
      setMessages(chatData.messages as Message[]);
    } else if (!chatId && !isChatLoading) {
      // Only reset messages if we're in a new chat and not loading
      setMessages([]);
    }
  }, [chatData, chatId, isChatLoading]);

  // Invalidate all relevant queries
  const invalidateQueries = useCallback(() => {
    // Invalidate the current chat
    if (chatId) {
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}`] });
    }
    // Always invalidate the chat list and latest chat
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

        // Invalidate queries to reload the latest data
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

  const [contextualPrompt, setContextualPrompt] = useState<{
    text: string;
    type: 'follow_up' | 'suggestion' | 'action';
    relevance: number;
  } | null>(null);

  // Generate contextual prompt with error handling
  const generateContextualPrompt = useCallback(async () => {
    if (messages.length > 0) {
      try {
        const recentMessages = messages.slice(-3);
        const res = await fetch('/api/analyze-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: recentMessages }),
          credentials: 'include'
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const prompt = await res.json();
        setContextualPrompt(prompt?.prompt || null);
      } catch (err) {
        console.error('Failed to generate prompt:', err);
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Could not generate contextual suggestions",
        });
      }
    }
  }, [messages, toast]);

  useEffect(() => {
    // Only generate on initial load
    generateContextualPrompt();
  }, []); // Empty dependency array

  return {
    messages,
    chatId: chatData?.id,
    sendMessage: mutation.mutateAsync,
    isLoading: mutation.isPending || isChatLoading || isProcessing,
    contextualPrompt,
    refreshContextualPrompt: generateContextualPrompt
  };
}