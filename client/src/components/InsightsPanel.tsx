import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Users, ChevronLeft, Star, ArrowUpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Insight {
  id: number;
  type: "connection_strength" | "network_gap" | "interaction_suggestion" | "relationship_health";
  title: string;
  description: string;
  suggestedAction?: string;
  priority: number;
  status: string;
}

interface InsightsPanelProps {
  variant?: "sidebar" | "embedded";
  onClose?: () => void;
  displayStyle?: "compact" | "full";
  maxItems?: number;
}

export function InsightsPanel({ 
  variant = "embedded", 
  onClose,
  displayStyle = "full",
  maxItems 
}: InsightsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: insights, isLoading } = useQuery<Insight[]>({
    queryKey: ["/api/insights"],
  });

  const implementInsight = useMutation({
    mutationFn: async (insightId: number) => {
      const res = await fetch(`/api/insights/implement/${insightId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to implement insight");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      toast({
        title: "Success",
        description: "Insight marked as implemented",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to implement insight",
      });
    },
  });

  const getInsightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "connection_strength":
        return Star;
      case "network_gap":
        return Users;
      case "interaction_suggestion":
        return ArrowUpCircle;
      case "relationship_health":
        return Lightbulb;
      default:
        return Lightbulb;
    }
  };

  const getInsightColor = (type: Insight["type"]) => {
    switch (type) {
      case "connection_strength":
        return "text-yellow-500";
      case "network_gap":
        return "text-blue-500";
      case "interaction_suggestion":
        return "text-green-500";
      case "relationship_health":
        return "text-purple-500";
      default:
        return "text-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading insights...
      </div>
    );
  }

  const activeInsights = insights?.filter(i => i.status === "active") || [];
  const displayInsights = maxItems ? activeInsights.slice(0, maxItems) : activeInsights;

  if (variant === "embedded") {
    return (
      <div className="space-y-4">
        {displayInsights.map((insight) => {
          const Icon = getInsightIcon(insight.type);
          const colorClass = getInsightColor(insight.type);

          return (
            <Card key={insight.id} className="relative overflow-hidden group">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${colorClass}`} />
                  {insight.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                <p>{insight.description}</p>
                {displayStyle === "full" && insight.suggestedAction && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      Suggested Action
                    </Badge>
                    <p className="mt-1 text-sm">{insight.suggestedAction}</p>
                  </div>
                )}
                {displayStyle === "full" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => implementInsight.mutate(insight.id)}
                  >
                    Mark as Done
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Sidebar variant
  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-lg z-50 overflow-y-auto">
      <div className="p-4 border-b sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Village Insights</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <AnimatePresence>
          {displayInsights.map((insight) => {
            const Icon = getInsightIcon(insight.type);
            const colorClass = getInsightColor(insight.type);

            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="relative overflow-hidden group">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${colorClass}`} />
                      {insight.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-600">
                    <p>{insight.description}</p>
                    {insight.suggestedAction && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-xs">
                          Suggested Action
                        </Badge>
                        <p className="mt-1 text-sm">{insight.suggestedAction}</p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => implementInsight.mutate(insight.id)}
                    >
                      Mark as Done
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Add default export while maintaining named export
export default InsightsPanel;