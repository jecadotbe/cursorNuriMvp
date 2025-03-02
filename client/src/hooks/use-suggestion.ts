import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";
import { useState, useRef, useCallback } from "react";

async function fetchSuggestions(): Promise<PromptSuggestion[]> {
  console.log('Fetching suggestions...');
  // Specify chat context to differentiate from village suggestions
  const response = await fetch('/api/suggestions?context=chat', {
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastFetchTime = useRef(Date.now());
  const fetchDebounceTimer = useRef<NodeJS.Timeout>();

  const debouncedFetch = useCallback(() => {
    if (fetchDebounceTimer.current) {
      clearTimeout(fetchDebounceTimer.current);
    }

    // Only fetch if more than 5 seconds have passed since last fetch
    const timeSinceLastFetch = Date.now() - lastFetchTime.current;
    if (timeSinceLastFetch < 5000) {
      return;
    }

    fetchDebounceTimer.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      lastFetchTime.current = Date.now();
    }, 1000);
  }, [queryClient]);

  const {
    data: suggestions,
    isLoading,
    error,
    refetch: refetchQuery
  } = useQuery({
    queryKey: ['suggestions'],
    queryFn: fetchSuggestions,
    staleTime: 60 * 60 * 1000, // Keep fresh for 60 minutes
    gcTime: 2 * 60 * 60 * 1000, // Cache for 2 hours
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 1000,
    enabled: true
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

      if (suggestions) {
        const updatedSuggestions = suggestions.filter(s => s.id !== suggestionId);
        queryClient.setQueryData(['suggestions'], updatedSuggestions);

        if (updatedSuggestions.length > 0) {
          const newIndex = Math.min(currentIndex, updatedSuggestions.length - 1);
          setCurrentIndex(newIndex);
        }
      }
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    }
  };

  const refetch = async (silent = false) => {
    if (isRefreshing) return;

    const timeSinceLastFetch = Date.now() - lastFetchTime.current;
    if (timeSinceLastFetch < 5000) {
      return;
    }

    try {
      if (!silent) {
        setIsRefreshing(true);
      }
      const result = await refetchQuery();
      if (result.data) {
        const newSuggestions = Array.isArray(result.data) ? result.data : [result.data];
        queryClient.setQueryData(['suggestions'], newSuggestions);
        setCurrentIndex(0);
        lastFetchTime.current = Date.now();
      }
    } catch (error) {
      console.error('Failed to refetch suggestions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load new suggestions",
      });
    } finally {
      setIsRefreshing(false);
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

      debouncedFetch();
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