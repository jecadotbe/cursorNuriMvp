import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, BookOpen, Brain, Heart, Target, Plus } from "lucide-react";

interface Prompt {
  id: string;
  category: string;
  text: string;
  description: string;
}

const SAMPLE_PROMPTS: Prompt[] = [
  {
    id: "1",
    category: "Personal Growth",
    text: "Help me develop a growth mindset for...",
    description: "Start a conversation about developing resilience and adaptability"
  },
  {
    id: "2",
    category: "Problem Solving",
    text: "I need help breaking down this challenge...",
    description: "Get assistance in analyzing and solving complex problems"
  },
  {
    id: "3",
    category: "Reflection",
    text: "Let's reflect on my progress with...",
    description: "Engage in meaningful self-reflection and assessment"
  }
];

const CATEGORIES = [
  { name: "Personal Growth", icon: Brain },
  { name: "Problem Solving", icon: Target },
  { name: "Reflection", icon: Heart },
];

interface PromptLibraryProps {
  onSelectPrompt: (prompt: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export function PromptLibrary({ onSelectPrompt, isExpanded, onToggle }: PromptLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredPrompts = selectedCategory
    ? SAMPLE_PROMPTS.filter(prompt => prompt.category === selectedCategory)
    : SAMPLE_PROMPTS;

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
                <BookOpen className="w-5 h-5 text-[#629785]" />
                <h2 className="font-semibold text-gray-800">Prompt Library</h2>
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

          <div className="flex gap-2 p-4 border-b border-gray-200">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.name}
                  variant={selectedCategory === category.name ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.name ? null : category.name
                  )}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {category.name.split(" ")[0]}
                </Button>
              );
            })}
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {filteredPrompts.map((prompt) => (
                <Card
                  key={prompt.id}
                  className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onSelectPrompt(prompt.text)}
                >
                  <p className="font-medium text-sm text-gray-800">{prompt.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{prompt.description}</p>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-gray-200">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onSelectPrompt("Custom prompt...")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Custom Prompt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
