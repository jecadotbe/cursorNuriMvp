# Village Suggestion Engine Documentation

## Overview

The Village Suggestion Engine is a core component of Nuri that provides personalized suggestions to users based on their village network structure, recent interactions, and user context. This document details how the system works from database to frontend.

## Architecture Flow

1. Database Layer → Backend Services → API Endpoints → Frontend Integration

### 1. Database Schema

The suggestion system relies on several interconnected tables:

```sql
prompt_suggestions
- id: serial (PK)
- user_id: integer (FK to users)
- text: text
- type: text
- context: text
- relevance: integer
- related_chat_id: integer (FK to chats)
- related_chat_title: text
- used_at: timestamp
- expires_at: timestamp
- created_at: timestamp

village_members
- id: serial (PK)
- user_id: integer (FK to users)
- name: text
- type: text
- role: text
- circle: integer
- category: member_category_enum
- contact_frequency: contact_frequency_enum
- position_angle: numeric
- metadata: jsonb

chats
- id: serial (PK)
- user_id: integer (FK to users)
- messages: jsonb
- content_embedding: text
```

### 2. Backend Generation Logic

The suggestion generator (`server/lib/suggestion-generator.ts`) works in multiple steps:

1. Analyzes village network gaps:
```typescript
const gaps = analyzeVillageGaps(members);
```

2. Processes recent chat context:
```typescript
const recentMessages = recentChats
  .slice(0, 2)
  .map(chat => chat.messages)
  .flat()
  .slice(-5);
```

3. Retrieves relevant memories:
```typescript
const memories = await memoryService.getRelevantMemories(
  userId,
  chatContext
);
```

4. Generates suggestions based on:
- Inner circle minimums (`CIRCLE_MINIMUMS[1]`)
- Outer network diversity (`CIRCLE_MINIMUMS[4]`)
- Network maintenance needs

### 3. API Integration

The suggestion system exposes these endpoints:

1. GET `/api/suggestions?context=village`
   - Returns active suggestions for the user's village
   - Filters out used suggestions
   - Includes context and relevance scores

2. POST `/api/suggestions/{id}/use`
   - Marks a suggestion as used
   - Updates the suggestion's `used_at` timestamp

### 4. Frontend Integration

The frontend uses a custom hook `useVillageSuggestions` that provides:

```typescript
interface VillageSuggestionOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxSuggestions?: number;
  filterByType?: string[];
}

const {
  suggestions,
  isLoading,
  error,
  refetch,
  markAsUsed
} = useVillageSuggestions({
  autoRefresh: true,
  refreshInterval: 300000, // 5 minutes
  maxSuggestions: 5
});
```

## Debugging Guide

### Common Issues:

1. Missing Suggestions
   - Check if user has village members in database
   - Verify VILLAGE_RULES minimums are properly set
   - Look for expired suggestions

2. Incorrect Circle Analysis
   - Debug gaps.circles Map values
   - Verify circle assignments in village_members table

3. Frontend Refresh Issues
   - Check `autoRefresh` setting
   - Verify React Query cache invalidation
   - Review suggestion filtering logic

### Database Queries for Debugging

```sql
-- Check active suggestions
SELECT * FROM prompt_suggestions 
WHERE user_id = :userId 
AND used_at IS NULL 
AND expires_at > NOW();

-- Verify village structure
SELECT circle, COUNT(*) 
FROM village_members 
WHERE user_id = :userId 
GROUP BY circle;

-- Review recent interactions
SELECT * FROM village_member_interactions
WHERE user_id = :userId
ORDER BY created_at DESC
LIMIT 5;
```

### Testing Points:

1. Backend Generation:
   - Verify gap analysis output
   - Check memory service responses
   - Validate suggestion priorities

2. API Endpoints:
   - Test suggestion filtering
   - Verify proper error handling
   - Check authorization flow

3. Frontend Integration:
   - Monitor React Query state
   - Test autoRefresh behavior
   - Verify proper rendering of suggestions

## Error Handling

1. Database Layer:
   - Foreign key constraints
   - Null checks on required fields
   - Timestamp validation

2. Backend Services:
   - Memory service availability
   - Village rules validation
   - Context processing errors

3. Frontend:
   - Loading states
   - Error boundaries
   - Stale data handling

## Performance Considerations

1. Database:
   - Indexed fields: content_embedding, user_id
   - Efficient joins for village queries
   - Regular cleanup of expired suggestions

2. Backend:
   - Cached village analysis
   - Batched message processing
   - Memory service optimization

3. Frontend:
   - Controlled refresh intervals
   - Proper React Query configuration
   - Efficient rendering optimization
