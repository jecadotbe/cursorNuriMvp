# Home Prompt Suggestions Implementation Guide

## Overview

The prompt suggestions system in HomeView.tsx provides personalized, context-aware suggestions to users on the home screen. This document details the complete implementation from database to UI rendering.

## Database Schema & Types

```typescript
// From @db/schema
interface PromptSuggestion {
  id: number;
  userId: number;
  text: string;
  type: string;
  context: string;
  relevance: number;
  relatedChatId: number | null;
  relatedChatTitle: string | null;
  usedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}
```

## Frontend Implementation (HomeView.tsx)

### Core Components

1. **Suggestion Hook Integration**
```typescript
const {
  suggestion,
  suggestions,
  isLoading: suggestionLoading,
  markAsUsed,
  nextSuggestion,
  dismissSuggestion,
  refetch,
  error: suggestionError
} = useSuggestion();
```

2. **State Management**
```typescript
const [isLoading, setIsLoading] = useState(false);
const [showSkeleton, setShowSkeleton] = useState(true);
const [hasSuggestions, setHasSuggestions] = useState(false);
const [showFeedback, setShowFeedback] = useState(false);
const [currentSuggestionId, setCurrentSuggestionId] = useState<number | null>(null);
```

### Loading & Error States

1. **Loading States**
```typescript
// Skeleton loading state condition
const shouldShowSkeleton = showSkeleton || suggestionLoading || (!hasSuggestions && !suggestion);

// Loading state UI
{shouldShowSkeleton ? (
  <Card className="bg-white mb-4">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
        <div className="w-48 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
      </div>
    </CardContent>
  </Card>
) : null}
```

2. **Error Handling**
```typescript
useEffect(() => {
  if (suggestionError) {
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to load suggestions. Please try again.",
    });
  }
}, [suggestionError]);
```

### Interaction Handlers

1. **Suggestion Click Handler**
```typescript
const handlePromptClick = async () => {
  if (!suggestion) return;

  try {
    await markAsUsed(suggestion.id);
    setCurrentSuggestionId(suggestion.id);

    if (suggestion.context === "existing" && suggestion.relatedChatId) {
      navigate(`/chat/${suggestion.relatedChatId}`);
    } else {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Chat ${format(new Date(), 'M/d/yyyy')}`,
          messages: [{
            role: 'assistant',
            content: suggestion.text
          }],
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to create new chat');
      }

      const newChat = await response.json();
      navigate(`/chat/${newChat.id}`);
    }

    setShowFeedback(true);
  } catch (error) {
    console.error('Error handling prompt:', error);
    toast({
      variant: "destructive",
      title: "Error",
      description: "Could not process the prompt. Please try again.",
    });
  }
};
```

2. **Suggestion Dismissal**
```typescript
const handleDismiss = (e: React.MouseEvent, suggestionId: number) => {
  e.stopPropagation();
  dismissSuggestion(suggestionId);
  nextSuggestion();
};
```

### UI Rendering

1. **Suggestion Card**
```tsx
<Card className="hover:shadow-md transition-shadow cursor-pointer mb-3 animate-border rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]">
  <CardContent className="p-4">
    <div className="flex items-center justify-between relative">
      {/* Dismiss button */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          if (suggestion) {
            dismissSuggestion(suggestion.id);
            nextSuggestion();
          }
        }}
        className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Suggestion content */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          {/* Type indicator */}
          <div className="w-2 h-2 rounded-full" style={{
            backgroundColor: suggestion.type === 'stress' ? '#EF4444' :
              suggestion.type === 'learning' ? '#3B82F6' :
              suggestion.type === 'village' ? '#10B981' :
              suggestion.type === 'child_development' ? '#8B5CF6' :
              suggestion.type === 'personal_growth' ? '#F59E0B' :
              '#6B7280'
          }}></div>

          {/* Type label */}
          <div className="text-sm font-semibold tracking-wide uppercase" style={{
            color: suggestion.type === 'stress' ? '#EF4444' :
              suggestion.type === 'learning' ? '#3B82F6' :
              suggestion.type === 'village' ? '#10B981' :
              suggestion.type === 'child_development' ? '#8B5CF6' :
              suggestion.type === 'personal_growth' ? '#F59E0B' :
              '#6B7280'
          }}>
            {suggestion.title || getTypeLabel(suggestion.type)}
          </div>
        </div>

        {/* Suggestion text */}
        <p className="text-lg pr-8">{suggestion.text}</p>

        {/* Related chat info */}
        {suggestion.context === "existing" && suggestion.relatedChatTitle && (
          <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>Vervolg op: {suggestion.relatedChatTitle}</span>
          </div>
        )}
      </div>

      {/* Navigation indicator */}
      <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
    </div>
  </CardContent>
</Card>
```

2. **Next Suggestion Button**
```tsx
<div className="flex justify-center gap-4 mt-2">
  <button
    onClick={() => {
      setIsLoading(true);
      nextSuggestion();
      setIsLoading(false);
    }}
    disabled={isLoading || suggestionLoading || !suggestions?.length}
    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <span>Toon andere suggestie ({suggestions?.length || 0})</span>
    <ChevronRight className="w-4 h-4" />
  </button>
</div>
```

## Data Flow

1. **Initial Load**
```typescript
useEffect(() => {
  if (!suggestionLoading && suggestions?.length > 0) {
    setHasSuggestions(true);
    setShowSkeleton(false);
  } else if (!suggestionLoading && suggestions?.length === 0) {
    setHasSuggestions(false);
    setShowSkeleton(false);
  }
}, [suggestionLoading, suggestions]);
```

2. **Refresh Logic**
```typescript
useEffect(() => {
  if (!hasSuggestions && !suggestionLoading) {
    refetch().catch(console.error);
  }
}, [hasSuggestions, suggestionLoading, refetch]);
```

## Common Issues & Solutions

1. **Type Safety**
   - Always check for `undefined` suggestions before accessing properties
   - Use proper type guards for suggestion properties
   - Handle loading states explicitly

2. **State Management**
   - Keep local and global states synchronized
   - Handle edge cases in suggestion transitions
   - Maintain proper loading states

3. **Error Boundaries**
   - Handle network errors gracefully
   - Provide user feedback for failures
   - Implement retry mechanisms

## Performance Optimizations

1. **State Updates**
   - Batch related state updates
   - Use callbacks for state updates in events
   - Avoid unnecessary re-renders

2. **Loading States**
   - Implement skeleton loading
   - Show transitional states
   - Handle loading timeouts

3. **Error Recovery**
   - Implement automatic retries
   - Cache previous suggestions
   - Provide fallback content
