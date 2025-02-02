
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";
import { useState, useRef, useCallback } from "react";

interface VillageSuggestionOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxSuggestions?: number;
  filterByType?: string[];
}

async function fetchVillageSuggestions(): Promise<PromptSuggestion[]> {
  const response = await fetch('/api/suggestions?type=village', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export function useVillageSuggestions(options: VillageSuggestionOptions = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    maxSuggestions = 5,
    filterByType = []
  } = options;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const lastFetchTime = useRef(Date.now());

  const {
    data: suggestions = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['village-suggestions'],
    queryFn: fetchVillageSuggestions,
    staleTime: refreshInterval,
    refetchInterval: autoRefresh ? refreshInterval : false,
    select: (data) => {
      let filtered = data;
      if (filterByType.length > 0) {
        filtered = data.filter(s => filterByType.includes(s.type));
      }
      return filtered.slice(0, maxSuggestions);
    }
  });

  const markAsUsed = async (suggestionId: number) => {
    try {
      await fetch(`/api/suggestions/${suggestionId}/use`, {
        method: 'POST',
        credentials: 'include',
      });
      
      // Remove from cache
      queryClient.setQueryData(['village-suggestions'], 
        (old: PromptSuggestion[] | undefined) => 
          old?.filter(s => s.id !== suggestionId) || []
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark suggestion as used"
      });
    }
  };

  const dismissSuggestion = async (suggestionId: number) => {
    try {
      await fetch(`/api/suggestions/${suggestionId}/dismiss`, {
        method: 'POST',
        credentials: 'include',
      });
      
      // Remove from cache
      queryClient.setQueryData(['village-suggestions'], 
        (old: PromptSuggestion[] | undefined) => 
          old?.filter(s => s.id !== suggestionId) || []
      );
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    }
  };

  return {
    suggestions,
    currentSuggestion: suggestions[currentIndex],
    isLoading,
    error,
    refetch,
    markAsUsed,
    dismissSuggestion,
    nextSuggestion: () => setCurrentIndex(i => (i + 1) % suggestions.length)
  };
}
