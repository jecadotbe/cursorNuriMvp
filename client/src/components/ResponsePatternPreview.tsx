import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Circle } from "lucide-react";

interface ResponsePattern {
  type: 'DIRECT' | 'REFLECTIVE' | 'STORY_BASED' | 'COLLABORATIVE';
  structure: 'VALIDATE_FIRST' | 'PRACTICAL_FIRST' | 'SCENARIO_BASED' | 'STEP_BY_STEP';
  progress: {
    empathy: number;
    advice: number;
    examples: number;
  };
  wordCount: number;
  isCompliant: boolean;
}

interface Props {
  currentPattern?: ResponsePattern;
  isVisible?: boolean;
  onPatternChange?: (pattern: Partial<ResponsePattern>) => void;
}

export function ResponsePatternPreview({ 
  currentPattern,
  isVisible = true,
  onPatternChange
}: Props) {
  const [debugMode, setDebugMode] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<ResponsePattern>({
    type: 'REFLECTIVE',
    structure: 'VALIDATE_FIRST',
    progress: {
      empathy: 80,
      advice: 60,
      examples: 40
    },
    wordCount: 85,
    isCompliant: true
  });

  useEffect(() => {
    if (currentPattern) {
      setSelectedPattern(currentPattern);
    }
  }, [currentPattern]);

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-24 right-4 w-80 bg-white/90 backdrop-blur-sm shadow-lg border-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Response Pattern Preview</CardTitle>
          <Switch
            checked={debugMode}
            onCheckedChange={setDebugMode}
            size="sm"
            className="ml-2"
          />
        </div>
        <CardDescription className="text-xs">
          Monitor and debug AI response patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Pattern Display */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant={selectedPattern.type === 'DIRECT' ? 'default' : 'outline'}>
              Direct
            </Badge>
            <Badge variant={selectedPattern.type === 'REFLECTIVE' ? 'default' : 'outline'}>
              Reflective
            </Badge>
            <Badge variant={selectedPattern.type === 'STORY_BASED' ? 'default' : 'outline'}>
              Story
            </Badge>
            <Badge variant={selectedPattern.type === 'COLLABORATIVE' ? 'default' : 'outline'}>
              Collaborative
            </Badge>
          </div>

          {/* Structure Indicator */}
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-xs font-medium mb-1">Current Structure:</p>
            <p className="text-sm">{selectedPattern.structure.replace(/_/g, ' ').toLowerCase()}</p>
          </div>

          {/* Progress Indicators */}
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">Empathy</label>
              <Progress value={selectedPattern.progress.empathy} className="h-2" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Advice</label>
              <Progress value={selectedPattern.progress.advice} className="h-2" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Examples</label>
              <Progress value={selectedPattern.progress.examples} className="h-2" />
            </div>
          </div>

          {/* Debug Controls */}
          {debugMode && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium mb-2">Debug Controls</p>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onPatternChange?.({ type: 'DIRECT' })}
                >
                  Force Direct
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onPatternChange?.({ type: 'REFLECTIVE' })}
                >
                  Force Reflective
                </Button>
              </div>
              <div className="mt-2 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span>Word Count:</span>
                  <span className={selectedPattern.wordCount > 100 ? 'text-red-500' : 'text-green-500'}>
                    {selectedPattern.wordCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pattern Compliance:</span>
                  {selectedPattern.isCompliant ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
