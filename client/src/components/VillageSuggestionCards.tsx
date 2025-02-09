import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Suggestion {
  id: number;
  text: string;
  context: string;
  relevance: number;
  type: string;
}

interface VillageSuggestionCardsProps {
  suggestions: Suggestion[];
  onDismiss: (id: number) => void;
  onNext: () => void;
  isLoading?: boolean;
}

export function VillageSuggestionCards({
  suggestions,
  onDismiss,
  onNext,
  isLoading = false,
}: VillageSuggestionCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const showNext = () => {
    if (currentIndex < suggestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const showPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!suggestions.length) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">Geen suggesties beschikbaar</p>
      </div>
    );
  }

  const currentSuggestion = suggestions[currentIndex];

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSuggestion.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{currentSuggestion.text}</h3>
                  <p className="text-sm text-gray-600 mt-2 italic">
                    Context: {currentSuggestion.context}
                  </p>
                </div>
                <div className="flex gap-2 items-start">
                  <Badge
                    variant={currentSuggestion.relevance > 3 ? "default" : "secondary"}
                  >
                    Prioriteit {currentSuggestion.relevance}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      onDismiss(currentSuggestion.id);
                      onNext();
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      <div className="flex justify-between mt-4">
        <Button
          variant="outline"
          size="icon"
          onClick={showPrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex gap-1">
          {suggestions.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentIndex ? "bg-primary" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={showNext}
          disabled={currentIndex === suggestions.length - 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
