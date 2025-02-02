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
  const response = await fetch('/api/suggestions?context=village', {
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
      return filtered.slice(0, maxSuggestions);
    }
  });

  const markAsUsed = async (suggestionId: number) => {
    try {
      await fetch(`/api/suggestions/${suggestionId}/use`, {
        method: 'POST',
        credentials: 'include',
      });

      queryClient.setQueryData(['village-suggestions'], 
        (old: PromptSuggestion[] | undefined) => 
          old?.map(s => s.id === suggestionId ? {...s, usedAt: new Date()} : s) || []
      );

      // Invalidate the query to refetch
      queryClient.invalidateQueries({ queryKey: ['village-suggestions'] });
    } catch (error) {
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