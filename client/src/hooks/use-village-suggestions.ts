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

      if (filterByType.length > 0) {
        filtered = data.filter(s => filterByType.includes(s.type as any));
      }

      filtered = filtered.filter(s => !s.usedAt);
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
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface Suggestion {
  id: number;
  text: string;
  type: string;
  title?: string;
  context?: string;
}

interface VillageSuggestionOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxSuggestions?: number;
  context?: string;
}

export function useVillageSuggestions(options: VillageSuggestionOptions = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    maxSuggestions = 3,
    context = "village",
  } = options;

  const [suggestions, setSuggestions] = useState<Suggestion[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchSuggestions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/suggestions/${context}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      setSuggestions(data.slice(0, maxSuggestions));
    } catch (err) {
      console.error("Error fetching village suggestions:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      toast({
        title: "Error",
        description: "Failed to load suggestions. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [context, maxSuggestions, toast]);

  const markAsUsed = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/suggestions/${id}/use`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to mark suggestion as used: ${response.statusText}`);
      }

      // Remove the used suggestion from the local state
      setSuggestions((prev) => prev?.filter((s) => s.id !== id));
      
      return true;
    } catch (err) {
      console.error("Error marking suggestion as used:", err);
      toast({
        title: "Error",
        description: "Failed to process suggestion. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const refetch = useCallback(() => {
    return fetchSuggestions();
  }, [fetchSuggestions]);

  useEffect(() => {
    fetchSuggestions();

    if (autoRefresh) {
      const interval = setInterval(fetchSuggestions, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchSuggestions, refreshInterval]);

  return {
    suggestions,
    isLoading,
    error,
    refetch,
    markAsUsed,
  };
}
