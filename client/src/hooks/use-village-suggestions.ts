import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";
import { useChatHistory } from "./use-chat-history";

interface VillageSuggestionOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxSuggestions?: number;
  filterByType?: ReadonlyArray<'network_growth' | 'network_expansion' | 'village_maintenance'>;
}

async function fetchVillageSuggestions(chatContext?: string): Promise<PromptSuggestion[]> {
  try {
    console.log('Fetching village suggestions with context:', chatContext);
    const url = new URL('/api/suggestions/village', window.location.origin);
    if (chatContext) {
      url.searchParams.append('context', chatContext);
    }

    const response = await fetch(url, {
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
    throw error;
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
  const { chats } = useChatHistory();

  // Get latest chat context
  const latestChatContext = chats?.[0]?.id ? `chat_${chats[0].id}` : undefined;

  const {
    data: suggestions = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['village-suggestions', latestChatContext],
    queryFn: () => fetchVillageSuggestions(latestChatContext),
    staleTime: autoRefresh ? refreshInterval : 0,
    gcTime: refreshInterval * 2,
    refetchInterval: autoRefresh ? refreshInterval : false,
    select: (data) => {
      let filtered = data;

      // Only filter by type if we have types to filter by and suggestions exist
      if (filterByType.length > 0 && filtered.length > 0) {
        // First try with exact type matches
        const exactMatches = filtered.filter(s => filterByType.includes(s.type as any));
        
        // If we found exact matches, use those
        if (exactMatches.length > 0) {
          filtered = exactMatches;
        } 
        // Otherwise, consider all suggestions valid (especially follow_up type)
        // This ensures we don't discard valid suggestions just because their type 
        // doesn't exactly match our filter
      }

      // Remove used suggestions
      filtered = filtered.filter(s => !s.usedAt);
      
      // Limit to max suggestions
      return filtered.slice(0, maxSuggestions);
    },
    retry: 1
  });

  const invalidateSuggestions = () => {
    queryClient.invalidateQueries({ queryKey: ['village-suggestions'] });
  };

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
        const error = await response.json();
        console.error('Error marking suggestion as used:', error);
        // Continue with UI update even if backend fails
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to mark suggestion as used');
      }

      // Update cache immediately
      queryClient.setQueryData(['village-suggestions', latestChatContext], 
        (old: PromptSuggestion[] | undefined) => 
          old?.map(s => s.id === suggestionId ? {...s, usedAt: new Date()} : s) || []
      );

      // Invalidate cache to trigger refresh
      invalidateSuggestions();
    } catch (error) {
      console.error('Error marking suggestion as used:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark suggestion as used"
      });
    }
  };

  // Force refresh suggestions
  const forceRefresh = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error forcing refresh:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to refresh suggestions"
      });
    }
  };

  return {
    suggestions,
    isLoading,
    error,
    refetch,
    markAsUsed,
    invalidateSuggestions,
    forceRefresh
  };
}