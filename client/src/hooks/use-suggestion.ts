import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";
import { useState } from "react";

async function fetchSuggestions(): Promise<PromptSuggestion[]> {
  console.log('Fetching suggestions...');
  const response = await fetch('/api/suggestions', {
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch suggestions:', errorText);
    throw new Error(`${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log('Suggestions fetched:', data);
  return data;
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
    refetchOnMount: true,
    retry: 1, // Only retry once to prevent long loading states
    retryDelay: 1000, // Retry after 1 second
  });

  // Get the current suggestion
  const suggestion = suggestions?.[currentIndex];

  const nextSuggestion = () => {
    if (suggestions?.length) {
      setCurrentIndex((prev) => (prev + 1) % suggestions.length);
    }
  };

  const dismissSuggestion = async (suggestionId: number) => {
    try {
      await fetch(`/api/suggestions/${suggestionId}/dismiss`, {
        method: 'POST',
        credentials: 'include',
      });
      
      // Update local state to remove the dismissed suggestion
      if (suggestions) {
        const updatedSuggestions = suggestions.filter(s => s.id !== suggestionId);
        queryClient.setQueryData(['suggestions'], updatedSuggestions);
        
        if (updatedSuggestions.length > 0) {
          // Adjust currentIndex if needed
          const newIndex = Math.min(currentIndex, updatedSuggestions.length - 1);
          setCurrentIndex(newIndex);
        } else {
          // If no suggestions left, fetch new ones
          const newSuggestions = await refetchQuery();
          if (newSuggestions?.data) {
            queryClient.setQueryData(['suggestions'], Array.isArray(newSuggestions.data) ? newSuggestions.data : [newSuggestions.data]);
            setCurrentIndex(0);
          }
        }
      }
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    }
  };

  const refetch = async () => {
    try {
      console.log('Refetching suggestions...');
      await fetch('/api/suggestions?refresh=true', {
        credentials: 'include'
      });
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
      console.log('Marking suggestion as used:', suggestionId);
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