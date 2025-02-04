import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";

interface VillageSuggestionOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxSuggestions?: number;
  filterByType?: ReadonlyArray<'network_growth' | 'network_expansion' | 'village_maintenance'>;
}

async function fetchVillageSuggestions(): Promise<PromptSuggestion[]> {
  try {
    console.log('Fetching village suggestions...');
    const response = await fetch('/api/suggestions/village', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
      console.error('Village suggestions response not OK:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(errorData.message || `Failed to fetch suggestions: ${response.status}`);
    }

    const data = await response.json();
    console.log('Fetched village suggestions:', data);

    if (!Array.isArray(data)) {
      console.error('Invalid suggestions data format:', data);
      throw new Error('Invalid suggestions data format');
    }

    return data;
  } catch (error) {
    console.error('Error fetching village suggestions:', error);
    throw error; // Let the query handle the error
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
        filtered = data.filter(s => filterByType.includes(s.type as any));
      }

      filtered = filtered.filter(s => !s.usedAt);
      return filtered.slice(0, maxSuggestions);
    },
    retry: 1,
    onError: (error: Error) => {
      console.error('Village suggestions query error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load village suggestions"
      });
    }
  });

  const markAsUsed = async (suggestionId: number) => {
    try {
      const response = await fetch(`/api/suggestions/${suggestionId}/use`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
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