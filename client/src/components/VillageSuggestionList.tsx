
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, RotateCcw, RefreshCw } from "lucide-react";

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
  const [showMorePrompt, setShowMorePrompt] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (suggestions.length > 0) {
      // Initialize with first 3 suggestions
      setVisibleSuggestions(suggestions.slice(0, 3));
      setShowMorePrompt(false);
    } else {
      setVisibleSuggestions([]);
      setShowMorePrompt(suggestions.length === 0 && !isLoading);
    }
    setLoadingMore(false);
  }, [suggestions, isLoading]);

  const handleDismiss = (id: number) => {
    onDismiss(id);
    setVisibleSuggestions(prev => prev.filter(s => s.id !== id));
    
    // If all visible suggestions are dismissed, ask for more
    if (visibleSuggestions.length === 1) {
      if (suggestions.length > visibleSuggestions.length) {
        // Show more from existing suggestions
        const nextIndex = visibleSuggestions.length;
        const additional = suggestions.slice(nextIndex, nextIndex + 3);
        setVisibleSuggestions(additional);
      } else {
        // No more suggestions available, show refresh prompt
        setShowMorePrompt(true);
      }
    }
  };

  const handleMoreSuggestions = () => {
    setLoadingMore(true);
    onNext();
  };

  if (isLoading && !loadingMore) {
    return (
      <div className="flex flex-col items-center justify-center p-6 gap-2">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        <span className="text-sm text-gray-500">Village suggesties laden</span>
      </div>
    );
  }

  if (showMorePrompt) {
    return (
      <div className="p-4 bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 rounded-lg text-center">
        <p className="mb-4">Geen suggesties meer beschikbaar. Wil je nieuwe suggesties genereren?</p>
        <Button 
          onClick={handleMoreSuggestions} 
          className="inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Genereer nieuwe suggesties</span>
        </Button>
      </div>
    );
  }

  if (visibleSuggestions.length === 0 && !showMorePrompt) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-500">Geen suggesties beschikbaar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleSuggestions.map((suggestion) => (
        <div key={suggestion.id} className="relative">
          <Card className="bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${getTypeColor(suggestion.type)}`} />
                    <span className="text-sm font-medium text-gray-600">
                      {getTypeLabel(suggestion.type)}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    {suggestion.text}
                  </p>
                  {suggestion.context && (
                    <p className="text-sm text-gray-500 mt-2 italic">
                      {suggestion.context}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDismiss(suggestion.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
      
      {suggestions.length > visibleSuggestions.length && (
        <div className="flex justify-center mt-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setLoadingMore(true);
              // Add 3 more suggestions to the visible list
              const nextIndex = visibleSuggestions.length;
              const additional = suggestions.slice(nextIndex, nextIndex + 3);
              setVisibleSuggestions(prev => [...prev, ...additional]);
              setLoadingMore(false);
            }}
            className="inline-flex items-center gap-2"
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                <span>Laden...</span>
              </>
            ) : (
              <>
                <span>Meer suggesties</span>
                <RotateCcw className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      )}
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
