
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, Plus } from "lucide-react";

interface Suggestion {
  id: number;
  text: string;
  context: string;
  relevance: number;
  type: string;
}

interface VillageSuggestionListProps {
  suggestions: Suggestion[];
  onDismiss: (id: number) => void;
  onNext: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function VillageSuggestionList({
  suggestions,
  onDismiss,
  onNext,
  onRefresh,
  isLoading = false,
}: VillageSuggestionListProps) {
  const [visibleSuggestions, setVisibleSuggestions] = useState<Suggestion[]>([]);
  const [needsMore, setNeedsMore] = useState(false);

  // Initialize visible suggestions when the component mounts or when suggestions change
  useEffect(() => {
    if (suggestions.length > 0) {
      // Take up to 3 suggestions to show initially
      setVisibleSuggestions(suggestions.slice(0, 3));
    } else {
      setVisibleSuggestions([]);
    }
  }, [suggestions]);

  const handleDismiss = (id: number) => {
    // Remove the suggestion from visible suggestions
    setVisibleSuggestions(prev => prev.filter(s => s.id !== id));
    
    // Call the onDismiss callback
    onDismiss(id);
    
    // Check if we need to ask for more suggestions
    if (visibleSuggestions.length <= 1) {
      setNeedsMore(true);
    }
  };

  const handleGetMoreSuggestions = () => {
    // Only fetch more if we have remaining suggestions
    const currentIds = new Set(visibleSuggestions.map(s => s.id));
    const remainingSuggestions = suggestions.filter(s => !currentIds.has(s.id));
    
    if (remainingSuggestions.length > 0) {
      // Add up to 3 more suggestions from the remaining ones
      const newSuggestions = remainingSuggestions.slice(0, 3);
      setVisibleSuggestions(prev => [...prev, ...newSuggestions]);
      setNeedsMore(false);
    } else {
      // If no more suggestions left, request new ones
      onNext();
      setNeedsMore(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (suggestions.length === 0 && !needsMore) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-500 mb-4">Geen suggesties beschikbaar</p>
        <Button onClick={onRefresh} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          <span>Nieuwe suggesties</span>
        </Button>
      </div>
    );
  }

  if (visibleSuggestions.length === 0 && needsMore) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-500 mb-4">Je hebt alle suggesties bekeken</p>
        <Button onClick={onNext} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Genereer nieuwe suggesties</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleSuggestions.map((suggestion) => (
        <Card key={suggestion.id} className="relative bg-white overflow-hidden">
          <div className="p-5">
            <div className="flex items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-2 h-2 rounded-full ${getTypeColor(suggestion.type)}`}
                  />
                  <span className="text-sm font-medium text-gray-600">
                    {getTypeLabel(suggestion.type)}
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {suggestion.text}
                </p>
                <p className="text-xs text-gray-500 mt-2 italic">
                  {suggestion.context}
                </p>
              </div>
              <button
                onClick={() => handleDismiss(suggestion.id)}
                className="p-1 hover:bg-gray-100 rounded-full ml-2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </Card>
      ))}

      {visibleSuggestions.length > 0 && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={handleGetMoreSuggestions}
            className="flex items-center gap-2"
          >
            <span>Meer suggesties</span>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function getTypeColor(type: string): string {
  switch (type) {
    case "network_growth":
      return "bg-emerald-500";
    case "network_expansion":
      return "bg-blue-500";
    case "village_maintenance":
      return "bg-orange-500";
    default:
      return "bg-gray-500";
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "network_growth":
      return "Versterk je village";
    case "network_expansion":
      return "Breidt je village uit";
    case "village_maintenance":
      return "Onderhoud je village";
    default:
      return "Suggestie";
  }
}
import { X, Wand, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Suggestion {
  id: number;
  text: string;
  type: string;
  context?: string;
  relevance?: number;
}

interface VillageSuggestionListProps {
  suggestions: Suggestion[];
  onDismiss: (id: number) => void;
  onNext: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function VillageSuggestionList({
  suggestions,
  onDismiss,
  onNext,
  onRefresh,
  isLoading = false,
}: VillageSuggestionListProps) {
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
        <Button
          onClick={onRefresh}
          className="mt-4"
          variant="outline"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Ververs suggesties
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion) => (
        <Card key={suggestion.id} className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            onClick={() => onDismiss(suggestion.id)}
          >
            <X className="w-4 h-4" />
          </Button>
          <CardContent className="p-4 pt-8">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-2 h-2 rounded-full ${getTypeColor(
                  suggestion.type
                )}`}
              />
              <span className="text-sm font-medium text-gray-600">
                {getTypeLabel(suggestion.type)}
              </span>
            </div>
            <p className="text-gray-700 mb-2">{suggestion.text}</p>
            {suggestion.context && (
              <p className="text-sm text-gray-500 italic">{suggestion.context}</p>
            )}
          </CardContent>
        </Card>
      ))}
      <div className="flex justify-center">
        <Button
          onClick={onNext}
          variant="outline"
          className="mt-2"
          disabled={isLoading}
        >
          <Wand className="w-4 h-4 mr-2" />
          Volgende suggestie
        </Button>
      </div>
    </div>
  );
}

function getTypeColor(type: string): string {
  switch (type) {
    case "network_growth":
      return "bg-emerald-500";
    case "network_expansion":
      return "bg-blue-500";
    case "village_maintenance":
      return "bg-orange-500";
    default:
      return "bg-gray-500";
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "network_growth":
      return "Versterk je village";
    case "network_expansion":
      return "Breidt je village uit";
    case "village_maintenance":
      return "Onderhoud je village";
    default:
      return "Suggestie";
  }
}
