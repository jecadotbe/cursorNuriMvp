
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  return (
    <div className="pb-2">
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion}
            variant="outline"
            size="sm"
            className="rounded-full bg-white hover:bg-gray-50 text-sm text-gray-700 border border-gray-300 flex items-center gap-2 whitespace-nowrap"
            onClick={() => onSelect(suggestion)}
          >
            <Star className="w-3 h-3" />
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
