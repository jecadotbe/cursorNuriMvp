import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface VillageInsight {
  id: number;
  type: "connection_strength" | "network_gap" | "interaction_suggestion" | "relationship_health";
  title: string;
  description: string;
  priority: number;
  status: "active" | "implemented";
  implementedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface UseVillageInsightsOptions {
  enabled?: boolean;
}

export function useVillageInsights(options: UseVillageInsightsOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch insights
  const {
    data: insights = [],
    isLoading,
    error,
    refetch
  } = useQuery<VillageInsight[]>({
    queryKey: ['/api/insights'],
    enabled: options.enabled ?? true,
  });

  // Generate new insights
  const generateInsights = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      return response.json();
    },
    onSuccess: (newInsight: VillageInsight) => {
      queryClient.setQueryData(['/api/insights'], (oldInsights: VillageInsight[] = []) => {
        return [...oldInsights, newInsight];
      });

      toast({
        title: "Success",
        description: "Generated new insight for your village",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate new insights. Please try again.",
      });
    },
  });

  // Implement insight
  const implementInsight = useMutation({
    mutationFn: async (insightId: number) => {
      const response = await fetch(`/api/insights/${insightId}/implement`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to implement insight');
      }

      return response.json();
    },
    onSuccess: (implementedInsight: VillageInsight) => {
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
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to implement insight. Please try again.",
      });
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