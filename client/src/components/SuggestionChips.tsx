import { Button } from "@/components/ui/button";

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  // Remove this early return to ensure the container is always rendered
  return (
    <div className="flex flex-wrap gap-2 mt-2 min-h-[32px]">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion}
          variant="outline"
          size="sm"
          className="rounded-full bg-white hover:bg-gray-50 text-sm text-gray-700 border border-gray-300"
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  );
}