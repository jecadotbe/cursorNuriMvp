import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, ArrowRight } from "lucide-react";

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
        <Card key={suggestion.id} className="bg-white overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${getTypeColor(suggestion.type)}`} />
                  <span className="text-sm font-medium text-gray-600">
                    {getTypeLabel(suggestion.type)}
                  </span>
                </div>
                <p className="text-gray-700">{suggestion.text}</p>
                {suggestion.context && (
                  <p className="text-sm text-gray-500 mt-2 italic">
                    {suggestion.context}
                  </p>
                )}
              </div>
              <button
                onClick={() => onDismiss(suggestion.id)}
                className="p-1.5 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-center">
        <Button 
          onClick={onNext} 
          variant="outline" 
          size="sm" 
          className="mt-2"
        >
          <span>Volgende suggesties</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
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