import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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
  onRefresh?: () => void; // Added onRefresh prop
  isLoading?: boolean;
}

export function VillageSuggestionCards({
  suggestions,
  onDismiss,
  onNext,
  onRefresh, // Added onRefresh prop
  isLoading = false,
}: VillageSuggestionCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitX, setExitX] = useState(0);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold && suggestions[currentIndex]) {
      setExitX(info.offset.x);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % suggestions.length);
        setExitX(0);
      }, 200);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 gap-2">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        <span className="text-sm text-gray-500">Village suggesties laden</span>
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
    <div className="relative h-[300px] touch-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSuggestion.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: exitX }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          whileDrag={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
          className="absolute w-full cursor-grab active:cursor-grabbing"
        >
          <Card className="bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${getTypeColor(currentSuggestion.type)}`} />
                    <span className="text-sm font-medium text-gray-600">
                      {getTypeLabel(currentSuggestion.type)}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    {currentSuggestion.text}
                  </p>
                  <p className="text-sm text-gray-500 mt-2 italic">
                    {currentSuggestion.context}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setCurrentIndex((prev) => (prev + 1) % suggestions.length);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1 pb-4">
        {suggestions.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? "bg-primary" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'network_growth':
      return 'bg-emerald-500';
    case 'network_expansion':
      return 'bg-blue-500';
    case 'village_maintenance':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'network_growth':
      return 'Versterk je village';
    case 'network_expansion':
      return 'Breidt je village uit';
    case 'village_maintenance':
      return 'Onderhoud je village';
    default:
      return 'Suggestie';
  }
}
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Users, Check, X, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Suggestion {
  id: number;
  text: string;
  type: string;
  context?: string;
  title?: string;
}

interface VillageSuggestionCardsProps {
  suggestions: Suggestion[] | undefined;
  onDismiss: (id: number) => void;
  onNext: () => void;
  onAction?: (suggestion: Suggestion) => void;
  isLoading: boolean;
}

export const VillageSuggestionCards: React.FC<VillageSuggestionCardsProps> = ({
  suggestions,
  onDismiss,
  onNext,
  onAction,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700">Geen suggesties beschikbaar</h3>
        <p className="text-gray-500 mb-4">Er zijn momenteel geen suggesties voor je village</p>
        <Button onClick={onNext} variant="outline" className="mx-auto">
          <RefreshCw className="w-4 h-4 mr-2" />
          Genereer suggesties
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {suggestions.map((suggestion) => (
        <Card key={suggestion.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">
              {suggestion.title || "Village Suggestie"}
            </CardTitle>
            <CardDescription className="text-xs">
              {suggestion.context || "Suggestie om je village te versterken"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{suggestion.text}</p>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDismiss(suggestion.id)}
              className="text-gray-500"
            >
              <X className="w-4 h-4 mr-1" />
              <span>Negeer</span>
            </Button>
            {suggestion.type === "member_suggestion" ? (
              <Button
                onClick={() => onAction && onAction(suggestion)}
                size="sm"
                className="bg-[#2F4644] hover:bg-[#3a5452]"
              >
                <User className="w-4 h-4 mr-1" />
                <span>Voeg toe</span>
              </Button>
            ) : (
              <Button
                onClick={() => onDismiss(suggestion.id)}
                size="sm"
                className="bg-[#2F4644] hover:bg-[#3a5452]"
              >
                <Check className="w-4 h-4 mr-1" />
                <span>Ik snap het</span>
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};
