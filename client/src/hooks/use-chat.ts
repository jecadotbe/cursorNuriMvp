import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import type { Chat } from "@db/schema";
import { useParams, useLocation } from "wouter";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date | string;  // Keep timestamp field for UI
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
    retry: false,
    staleTime: 0, // Always fetch fresh data
  });

  // Maintain local messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize messages when chatData changes
  useEffect(() => {
    if (chatData?.messages) {
      // Ensure messages have timestamps when loading from chatData
      setMessages((chatData.messages as Message[]).map(msg => ({
        ...msg,
        timestamp: msg.timestamp || new Date(chatData.createdAt)
      })));
    } else if (!chatId && !isChatLoading) {
      // Only reset messages if we're in a new chat and not loading
      setMessages([]);
    }
  }, [chatData, chatId, isChatLoading]);

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const timestamp = new Date().toISOString();
      const userMessage: Message = { 
        role: "user", 
        content,
        timestamp 
      };

      // Update messages immediately for better UX
      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Strip timestamps when sending to API
            messages: [...messages, userMessage].map(({ role, content }) => ({
              role,
              content,
            })),
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
          timestamp: new Date().toISOString()
        };

        // Update messages with assistant's response
        setMessages((prev) => [...prev, assistantMessage]);

        // Invalidate queries to reload the latest chat data
        queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/chats/latest"] });
        if (chatId) {
          queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}`] });
        }

        return chatResponse.content;
      } finally {
        setIsProcessing(false);
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      setIsProcessing(false);
    },
  });

  const [contextualPrompt, setContextualPrompt] = useState<{
    text: string;
    type: 'follow_up' | 'suggestion' | 'action';
    relevance: number;
  } | null>(null);

  // Only generate contextual prompt on manual refresh or initial load
  const generateContextualPrompt = useCallback(async () => {
    if (messages.length > 0) {
      try {
        const recentMessages = messages.slice(-3);
        const res = await fetch('/api/analyze-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Strip timestamps when sending to API
          body: JSON.stringify({ 
            messages: recentMessages.map(({ role, content }) => ({ role, content }))
          }),
          credentials: 'include'
        });
        const prompt = await res.json();
        setContextualPrompt(prompt);
      } catch (err) {
        console.error('Failed to generate prompt:', err);
      }
    }
  }, [messages]);

  useEffect(() => {
    // Only generate on initial load
    generateContextualPrompt();
  }, []); // Empty dependency array

  return {
    messages,
    chatId: chatData?.id,
    sendMessage: mutation.mutateAsync,
    isLoading: mutation.isPending || isChatLoading || isProcessing,
    contextualPrompt
  };
}