import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";

async function fetchSuggestions(): Promise<PromptSuggestion[]> {
  const response = await fetch('/api/suggestions?limit=3', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  console.log('Fetched suggestions:', data); // Debug log
  return data;
}

export function useSuggestion() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: suggestions = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['suggestions'],
    queryFn: fetchSuggestions,
    enabled: true, // Always enabled to fetch suggestions
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: false,
    onError: (error) => {
      console.error('Failed to fetch suggestions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load suggestions",
      });
    },
  });

  const markAsUsed = async (suggestionId: number) => {
    try {
      const response = await fetch(`/api/suggestions/${suggestionId}/use`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }

      // Invalidate the suggestions query to fetch new ones
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    } catch (error) {
      console.error('Failed to mark suggestion as used:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark suggestion as used",
      });
    }
  };

  console.log('Current suggestions:', suggestions); // Debug log

  return {
    suggestions,
    isLoading,
    error,
    refetch,
    markAsUsed,
  };
}