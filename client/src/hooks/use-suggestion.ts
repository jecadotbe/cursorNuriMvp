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
  console.log('Raw suggestions data:', data); // Debug log

  // Normalize the response to always be an array
  let suggestions: PromptSuggestion[];

  if (!data) {
    console.warn('No data received from suggestions API');
    suggestions = [];
  } else if (Array.isArray(data)) {
    suggestions = data;
  } else if (typeof data === 'object' && data !== null) {
    // Single suggestion object
    suggestions = [data];
  } else {
    console.warn('Invalid data format received from suggestions API:', data);
    suggestions = [];
  }

  console.log('Normalized suggestions:', suggestions); // Debug log
  return suggestions;
}

export function useSuggestion() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryOptions: UseQueryOptions<PromptSuggestion[], Error> = {
    queryKey: ['suggestions'],
    queryFn: fetchSuggestions,
    enabled: true,
    staleTime: 5 * 60 * 1000,
    retry: false,
    initialData: [] as PromptSuggestion[],
  };

  const {
    data: suggestions = [],
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