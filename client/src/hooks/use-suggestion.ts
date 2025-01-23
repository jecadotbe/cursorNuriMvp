import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PromptSuggestion } from "@db/schema";
import { useToast } from "./use-toast";
import type { UseQueryOptions } from "@tanstack/react-query";

async function fetchSuggestions(): Promise<PromptSuggestion[]> {
  const response = await fetch('/api/suggestions?limit=3', {
    credentials: 'include',
  });

  // Log the response status and headers for debugging
  console.log('Suggestions response:', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  });

  // 304 Not Modified is a successful response, continue processing
  if (!response.ok && response.status !== 304) {
    throw new Error(`${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  console.log('Fetched suggestions data:', data); // Debug log

  // Ensure we return an empty array if data is null/undefined
  if (!data) {
    console.warn('No data received from suggestions API');
    return [];
  }

  // If data is not an array, wrap it in an array
  const suggestions = Array.isArray(data) ? data : [data];
  console.log('Processed suggestions:', suggestions); // Debug log
  return suggestions;
}

export function useSuggestion() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryOptions: UseQueryOptions<PromptSuggestion[], Error> = {
    queryKey: ['suggestions'],
    queryFn: fetchSuggestions,
    enabled: true, // Always enabled to fetch suggestions
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: false,
    // Initialize with empty array to prevent undefined
    initialData: [],
  };

  const {
    data: suggestions = [], // Provide empty array as fallback
    isLoading,
    error,
    refetch
  } = useQuery<PromptSuggestion[], Error>(queryOptions);

  // Handle errors outside the query options
  if (error) {
    console.error('Failed to fetch suggestions:', error);
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to load suggestions",
    });
  }

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

  return {
    suggestions: suggestions as PromptSuggestion[],
    isLoading,
    error,
    refetch,
    markAsUsed,
  };
}