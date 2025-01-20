import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface VillageInsight {
  id: number;
  type: "connection_strength" | "network_gap" | "interaction_suggestion" | "relationship_health";
  title: string;
  description: string;
  suggestedAction?: string;
  priority: number;
  status: string;
  relatedMemberIds?: number[];
}

export function useVillageInsights() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: insights, isLoading, error } = useQuery<VillageInsight[]>({
    queryKey: ['/api/insights'],
    retry: 1,
    staleTime: 0, // Always fetch fresh data
    refetchInterval: 30000, // Refetch every 30 seconds for testing
    onError: (error: Error) => {
      console.error('Failed to fetch insights:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load insights. Please try again.",
      });
    }
  });

  const implementInsight = useMutation({
    mutationFn: async (insightId: number) => {
      const response = await fetch(`/api/insights/${insightId}/implement`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
      toast({
        title: "Success",
        description: "Insight marked as implemented",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  return {
    insights: insights || [],
    isLoading,
    error,
    implementInsight,
  };
}