import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";

async function fetchSuggestion(): Promise<PromptSuggestion> {
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

  const {
    data: suggestion,
    isLoading,
    error,
    refetch: refetchQuery
  } = useQuery({
    queryKey: ['suggestion'],
    queryFn: fetchSuggestion,
    gcTime: 0, // Don't cache invalidated data
    staleTime: 0, // Always refetch when requested
  });

  const refetch = async () => {
    try {
      await refetchQuery();
    } catch (error) {
      console.error('Failed to refetch suggestion:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load new suggestion",
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

      // Invalidate the suggestion query to fetch a new one
      queryClient.invalidateQueries({ queryKey: ['suggestion'] });
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
    isLoading,
    error,
    refetch,
    markAsUsed,
  };
}
