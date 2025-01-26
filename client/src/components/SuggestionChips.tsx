
import { Button } from "@/components/ui/button";
import { Star, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export function SuggestionChips({ suggestions, onSelect, isExpanded, onToggle }: SuggestionChipsProps) {
  return (
    <div
      className={`fixed right-0 top-16 bottom-24 bg-white border-l border-gray-200 shadow-lg transition-all duration-300 z-40 ${
        isExpanded ? "w-80" : "w-0"
      }`}
    >
      {isExpanded && (
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[#629785]" />
                <h2 className="font-semibold text-gray-800">Suggesties</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="hover:bg-gray-100"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <Card
                  key={index}
                  className="p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start gap-2">
                    <p 
                      className="text-sm text-gray-800 cursor-pointer" 
                      onClick={() => onSelect(suggestion)}
                    >
                      {suggestion}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(suggestion.id, false);
                      }}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
