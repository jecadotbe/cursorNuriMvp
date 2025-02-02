# Nuri Village Suggestion System: Technical Overview

## Core Files Overview

### Frontend Components

1. **[VillageView Component](client/src/pages/VillageView.tsx)**
   - Main interface for displaying village suggestions
   - Uses `useVillageSuggestions` hook for fetching and managing suggestions
   - Implements suggestion interaction UI through the Sheet component
   - Triggers suggestion generation when:
     - User opens the suggestions panel
     - User manually refreshes suggestions
     - Auto-refresh interval is reached (if enabled)

2. **[useVillageSuggestions Hook](client/src/hooks/use-village-suggestions.ts)**
   - Core hook for managing village suggestions
   - Features:
     - Auto-refresh capability
     - Suggestion filtering
     - Suggestion marking as used
   - Uses React Query for data fetching and caching
   - Handles error states and loading states

### Backend Components

1. **[Suggestions Router](server/routes/chat/suggestions.ts)**
   - Main API endpoints for suggestion management
   - Handles all suggestion-related operations and storage

## Suggestion Generation and Storage Flow

### 1. Generation Trigger Points

Suggestions are generated at these specific moments:

a) **Automatic Generation:**
   ```typescript
   // In suggestions.ts router
   if (existingVillageSuggestions.length < 3) {
     const newSuggestions = await generateVillageSuggestions(
       user.id,
       members,
       recentChats,
       memoryService
     );
   }
   ```
   - Occurs when fetching suggestions via GET `/api/suggestions?context=village`
   - Triggers if user has fewer than 3 active suggestions
   - Uses village context and recent interactions for generation

b) **Manual Refresh:**
   ```typescript
   // In VillageView.tsx
   const handleRefresh = async () => {
     await refetchSuggestions();
   };
   ```
   - Triggered by user clicking refresh button
   - Forces new suggestion generation

### 2. Storage Process

a) **Database Storage:**
   ```sql
   -- Suggestions are stored in prompt_suggestions table
   prompt_suggestions
   - id: serial (PK)
   - user_id: integer (FK to users)
   - text: text
   - type: text ['network_gap', 'village_interaction', 'network_expansion']
   - context: text
   - relevance: integer
   - related_chat_id: integer (FK to chats)
   - used_at: timestamp
   - expires_at: timestamp
   - created_at: timestamp
   ```

b) **Storage Operations:**
   ```typescript
   // In suggestions.ts router
   if (newSuggestions.length > 0) {
     await db.insert(promptSuggestions).values(newSuggestions);
   }
   ```
   - New suggestions are immediately stored in database
   - Each suggestion has an expiration time
   - Used suggestions are marked with `used_at` timestamp

### 3. Complete Lifecycle

1. **Generation Request:**
   - Frontend makes GET request to `/api/suggestions?context=village`
   - Backend checks existing suggestions count

2. **Context Gathering:**
   ```typescript
   const members = await db.query.villageMembers.findMany({
     where: eq(villageMembers.userId, user.id),
   });

   const recentChats = await db.query.chats.findMany({
     where: eq(chats.userId, user.id),
     orderBy: desc(chats.updatedAt),
     limit: 2
   });
   ```
   - Retrieves village members
   - Gets recent chat history
   - Loads relevant memories

3. **Suggestion Generation:**
   ```typescript
   const newSuggestions = await generateVillageSuggestions(
     user.id,
     members,
     recentChats,
     memoryService
   );
   ```
   - Uses Anthropic's Claude API for generation
   - Incorporates village context and user history
   - Assigns relevance scores and types

4. **Storage and Return:**
   ```typescript
   // Store new suggestions
   await db.insert(promptSuggestions).values(newSuggestions);

   // Return combined suggestions
   return res.json([...existingVillageSuggestions, ...newSuggestions]);
   ```
   - Stores new suggestions in database
   - Returns combined list to frontend

5. **Frontend Display:**
   ```typescript
   const {
     suggestions,
     isLoading,
     refetch,
     markAsUsed
   } = useVillageSuggestions({
     autoRefresh: false,
     maxSuggestions: 5,
     filterByType: ['network_gap', 'village_interaction']
   });
   ```
   - Displays suggestions in UI
   - Handles interaction (dismiss/use)
   - Manages suggestion lifecycle

### 4. Suggestion Maintenance

1. **Expiration:**
   - Suggestions expire after a set time period
   - Expired suggestions are not returned in queries
   ```sql
   WHERE expires_at > NOW()
   ```

2. **Usage Marking:**
   ```typescript
   // When suggestion is used
   await db.update(promptSuggestions)
     .set({ usedAt: new Date() })
     .where(eq(promptSuggestions.id, suggestionId));
   ```
   - Marks suggestions as used when acted upon
   - Used suggestions are filtered out of future queries

3. **Refresh Mechanism:**
   ```typescript
   // In useVillageSuggestions hook
   useQuery({
     queryKey: ['village-suggestions'],
     queryFn: fetchVillageSuggestions,
     staleTime: refreshInterval,
     refetchInterval: autoRefresh ? refreshInterval : false,
   });
   ```
   - Handles automatic refresh if enabled
   - Manages suggestion staleness
   - Triggers new generation when needed

## Error Handling and Recovery

1. **Generation Failures:**
   ```typescript
   try {
     const suggestions = await generateVillageSuggestions(...);
   } catch (error) {
     console.error("Error generating suggestions:", error);
     // Return default suggestions
     return [
       "Kan je me daar meer over vertellen?",
       "Hoe voel je je daar precies bij?",
       // ...more defaults
     ];
   }
   ```
   - Falls back to default suggestions on error
   - Logs errors for debugging
   - Maintains user experience

2. **Storage Recovery:**
   ```typescript
   if (!updated) {
     return res.status(404).json({ message: "Suggestion not found" });
   }
   ```
   - Handles database operation failures
   - Provides clear error messages
   - Maintains data consistency

## Performance Optimization

1. **Caching:**
   ```typescript
   useQuery({
     queryKey: ['village-suggestions'],
     staleTime: refreshInterval,
     cacheTime: refreshInterval * 2
   });
   ```
   - Efficient React Query caching
   - Optimized refetch intervals
   - Reduced API calls

2. **Batch Operations:**
   ```typescript
   // Batch insert new suggestions
   if (newSuggestions.length > 0) {
     await db.insert(promptSuggestions).values(newSuggestions);
   }
   ```
   - Batched database operations
   - Efficient suggestion generation
   - Optimized storage operations