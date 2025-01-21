import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface VillageInsight {
  id: number;
  type: "connection_strength" | "network_gap" | "interaction_suggestion" | "relationship_health";
  title: string;
  description: string;
  suggestedAction?: string;
  priority: number;
  status: "active" | "implemented";
  relatedMemberIds?: number[];
  implementedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface UseVillageInsightsOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

export function useVillageInsights(options: UseVillageInsightsOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: insights = [],
    isLoading,
    error,
    refetch
  } = useQuery<VillageInsight[]>({
    queryKey: ['/api/insights'],
    refetchInterval: options.refetchInterval ?? 30000,
    enabled: options.enabled ?? true,
  });

  const generateInsights = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: (newInsights) => {
      queryClient.setQueryData(['/api/insights'], (oldInsights: VillageInsight[] = []) => {
        // Merge new insights with existing ones, avoiding duplicates
        const existingIds = new Set(oldInsights.map(i => i.id));
        return [
          ...oldInsights,
          ...newInsights.filter((i: VillageInsight) => !existingIds.has(i.id))
        ];
      });

      toast({
        title: "Success",
        description: "Generated new insights for your village",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate new insights. Please try again.",
      });
      console.error('Failed to generate insights:', error);
    },
  });

  const implementInsight = useMutation({
    mutationFn: async (insightId: number) => {
      const response = await fetch(`/api/insights/${insightId}/implement`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: (implementedInsight) => {
      queryClient.setQueryData(['/api/insights'], (oldInsights: VillageInsight[] = []) => {
        return oldInsights.map(insight =>
          insight.id === implementedInsight.id ? implementedInsight : insight
        );
      });

      toast({
        title: "Success",
        description: "Insight marked as implemented",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to implement insight. Please try again.",
      });
      console.error('Failed to implement insight:', error);
    },
  });

  return {
    insights: insights.filter(i => i.status === "active"),
    implementedInsights: insights.filter(i => i.status === "implemented"),
    isLoading,
    error,
    generateInsights,
    implementInsight,
    refetch,
  };
}