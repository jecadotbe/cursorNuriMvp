import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Suggestion {
  id: number;
  text: string;
  type: string;
  context: string;
  relevance: number;
}

interface GenerateSuggestionsResponse {
  suggestions: string[];
}

export function useSuggestion() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateSuggestions = async (chatId: number | null, lastMessageContent: string): Promise<string[]> => {
    try {
      const response = await fetch(`/api/suggestions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          lastMessageContent
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const data: GenerateSuggestionsResponse = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Error generating suggestions:', error);
      throw error;
    }
  };

  const {
    data: currentSuggestion,
    isLoading,
    error,
    refetch
  } = useQuery<Suggestion>({
    queryKey: ['suggestion'],
    queryFn: async () => {
      const response = await fetch('/api/suggestions', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestion');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
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

      queryClient.invalidateQueries({ queryKey: ['suggestion'] });
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
    currentSuggestion,
    isLoading,
    error,
    refetch,
    generateSuggestions,
    markAsUsed,
  };
}