import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
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
  const chatId = params?.id ? parseInt(params.id) : undefined;
  const [, navigate] = useLocation();

  // Load existing chat messages
  const { data: chatData, isLoading: isChatLoading } = useQuery<ChatResponse>({
    queryKey: [`/api/chats/${chatId}`],
    enabled: !!chatId, // Only run query if we have a chatId
    retry: (failureCount, error: any) => {
      return failureCount < 3 && error?.message?.includes('network');
    },
    staleTime: 5000,
    gcTime: 30 * 60 * 1000,
  });

  // Maintain local messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize messages when chatData changes
  useEffect(() => {
    if (chatData?.messages) {
      setMessages(chatData.messages);
    } else if (!chatId && !isChatLoading) {
      setMessages([]);
    }
  }, [chatData, chatId, isChatLoading]);

  // Invalidate all relevant queries
  const invalidateQueries = useCallback(() => {
    if (chatId) {
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}`] });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
  }, [chatId, queryClient]);

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const userMessage: Message = { role: "user", content };

      try {
        console.log('Sending message, chatId:', chatId); // Debug log
        setMessages((prev) => [...prev, userMessage]);
        setIsProcessing(true);

        const response = await fetch("/api/chats/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            messages: [...messages, userMessage],
            chatId: chatId
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Chat message error:', errorText); // Debug log
          throw new Error(errorText);
        }

        const chatResponse = await response.json();
        console.log('Chat response:', chatResponse); // Debug log

        const assistantMessage: Message = {
          role: "assistant",
          content: chatResponse.content,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        await invalidateQueries();

        return chatResponse.content;
      } catch (error) {
        setMessages((prev) => prev.slice(0, -1));
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
      });
    },
  });

  return {
    messages,
    chatId: chatId || chatData?.id,
    sendMessage: mutation.mutateAsync,
    isLoading: mutation.isPending || isChatLoading || isProcessing,
    refreshMessages: invalidateQueries,
  };
}