import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";
import { useState } from "react";

async function fetchSuggestions(): Promise<PromptSuggestion[]> {
  const response = await fetch('/api/suggestions', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export function useSuggestion() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);

  const {
    data: suggestions,
    isLoading,
    error,
    refetch: refetchQuery
  } = useQuery({
    queryKey: ['suggestions'],
    queryFn: fetchSuggestions,
    staleTime: 5 * 60 * 1000, // Keep fresh for 5 minutes
    gcTime: 30 * 60 * 1000,   // Cache for 30 minutes
    refetchOnMount: true
  });

  // Get the current suggestion
  const suggestion = suggestions?.[currentIndex];

  const nextSuggestion = () => {
    if (suggestions?.length) {
      setCurrentIndex((prev) => (prev + 1) % suggestions.length);
    }
  };

  const refetch = async () => {
    try {
      await refetchQuery();
      // Reset to first suggestion after refetch
      setCurrentIndex(0);
    } catch (error) {
      console.error('Failed to refetch suggestions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load new suggestions",
      });
    }
  };

  const markAsUsed = async (suggestionId: number) => {
    try {
      const response = await fetch(`/api/suggestions/${suggestionId}/use`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }

      // Prefetch new suggestions after marking one as used
      queryClient.prefetchQuery({
        queryKey: ['suggestions'],
        queryFn: fetchSuggestions,
      });
    } catch (error) {
      console.error('Failed to mark suggestion as used:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark suggestion as used",
      });
    }
  };

  const dismissSuggestion = async (suggestionId: number, needsNew: boolean = false) => {
    try {
      const response = await fetch(`/api/suggestions/${suggestionId}/dismiss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ needsNew }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }

      if (needsNew) {
        // Wait for new suggestions and update the view
        await refetch();
      } else {
        // Just remove the suggestion locally
        queryClient.setQueryData(['suggestions'], (old: any) => 
          old?.filter((s: any) => s.id !== suggestionId)
        );
      }
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to dismiss suggestion",
      });
    }
  };

  return {
    suggestion,
    suggestions,
    isLoading,
    error,
    refetch,
    markAsUsed,
    nextSuggestion,
    dismissSuggestion,
  };
}