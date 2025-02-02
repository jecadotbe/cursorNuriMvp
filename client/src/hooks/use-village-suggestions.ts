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
      console.log('Processing village suggestions:', data);
      let filtered = data;

      console.log('Raw data from API:', data);
      
      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error('API response is not an array:', data);
        return [];
      }

      // First filter by type if specified
      if (filterByType.length > 0) {
        console.log('Filtering by types:', filterByType);
        filtered = data.filter(s => {
          const isValidType = filterByType.includes(s.type);
          console.log(`Suggestion ${s.id}: type=${s.type}, included=${isValidType}`);
          return isValidType;
        });
      }

      // Then filter out used suggestions
      filtered = filtered.filter(s => {
        const isUnused = !s.usedAt;
        console.log(`Suggestion ${s.id}: usedAt=${s.usedAt}, unused=${isUnused}`);
        return isUnused;
      });

      // Take max number of suggestions
      const result = filtered.slice(0, maxSuggestions);
      console.log('Final filtered suggestions:', result);

      return result;
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