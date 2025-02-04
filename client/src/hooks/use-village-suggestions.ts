
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";

interface VillageSuggestionOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxSuggestions?: number;
  filterByType?: string[];
}

async function fetchVillageSuggestions(): Promise<PromptSuggestion[]> {
  try {
    const response = await fetch('/api/suggestions/village', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Village suggestions response not OK:', response.status);
      return [];
    }

    const data = await response.json();
    console.log('Fetched village suggestions:', data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching village suggestions:', error);
    return [];
  }
}

export function useVillageSuggestions(options: VillageSuggestionOptions = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 300000,
    maxSuggestions = 5,
    filterByType = []
  } = options;

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

      filtered = filtered.filter(s => !s.usedAt);
      return filtered.slice(0, maxSuggestions);
    }
  });

  const markAsUsed = async (suggestionId: number) => {
    try {
      const response = await fetch(`/api/suggestions/${suggestionId}/use`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to mark suggestion as used');
      }

      queryClient.setQueryData(['village-suggestions'], 
        (old: PromptSuggestion[] | undefined) => 
          old?.map(s => s.id === suggestionId ? {...s, usedAt: new Date()} : s) || []
      );
    } catch (error) {
      console.error('Error marking suggestion as used:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark suggestion as used"
      });
    }
  };

  return {
    suggestions,
    isLoading,
    error,
    refetch,
    markAsUsed
  };
}
