import { useVillageInsights, type VillageInsight } from "@/hooks/use-village-insights";
import { Lightbulb, Users, ChevronLeft, Star, ArrowUpCircle, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface InsightsPanelProps {
  variant?: "sidebar" | "embedded";
  onClose?: () => void;
  displayStyle?: "compact" | "full";
  maxItems?: number;
  autoRefresh?: boolean;
}

export function InsightsPanel({
  variant = "embedded",
  onClose,
  displayStyle = "full",
  maxItems,
  autoRefresh = false,
}: InsightsPanelProps) {
  const {
    insights,
    isLoading,
    generateInsights,
    implementInsight,
    refetch
  } = useVillageInsights({
    refetchInterval: autoRefresh ? 30000 : false
  });

  const getInsightIcon = (type: VillageInsight["type"]) => {
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

  const getInsightColor = (type: VillageInsight["type"]) => {
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
      <div className="space-y-4">
        {[...Array(maxItems || 3)].map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const displayInsights = maxItems ? insights.slice(0, maxItems) : insights;

  const InsightsList = () => (
    <div className="space-y-4">
      {displayInsights.length === 0 ? (
        <Card className="relative overflow-hidden">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-500 mb-4">No active insights available</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateInsights.mutate()}
              disabled={generateInsights.isPending}
            >
              Generate New Insights
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
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
                        disabled={implementInsight.isPending}
                      >
                        Mark as Done
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </>
      )}
    </div>
  );

  if (variant === "embedded") {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Village Insights</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
        <InsightsList />
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-lg z-50 overflow-y-auto">
      <div className="p-4 border-b sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Village Insights</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4">
        <InsightsList />
      </div>
    </div>
  );
}

export default InsightsPanel;