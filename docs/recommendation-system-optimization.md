# Nuri Recommendation System Optimization Plan

## Current System Analysis

### Chat Recommendations

#### Current Implementation
1. Basic Memory Integration:
```typescript
const relevantMemories = await memoryService.getRelevantMemories(
  userId,
  lastMessage,
);
```
- Uses simple relevance matching
- No temporal context consideration
- Limited use of memory types

2. Suggestion Generation:
```typescript
const suggestions = await generateVillageSuggestions(
  userId,
  members,
  villageContext,
  memoryService
);
```
- Single-pass generation
- Limited context integration
- No feedback loop incorporation

3. Issues Identified:
- Suggestions persist after dismissal
- Limited relevance scoring
- Basic memory retrieval
- No temporal context consideration
- Limited personalization

## Proposed Optimizations

### 1. Enhanced Memory Integration

#### Leverage mem0's Advanced Features:
```typescript
interface MemoryQuery {
  content: string;
  metadata: {
    type: "chat" | "village" | "interaction";
    relevanceWindow: DateRange;
    contextualTags: string[];
  };
  retrievalParams: {
    temporalBoost: number;
    semanticThreshold: number;
    maxResults: number;
  };
}
```

Benefits:
- Temporal relevance weighting
- Contextual memory filtering
- Improved semantic matching

### 2. Improved Suggestion Persistence

#### New Suggestion Storage Schema:
```sql
CREATE TABLE suggestion_dismissals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  suggestion_hash TEXT NOT NULL,
  dismissed_at TIMESTAMP DEFAULT NOW(),
  dismissal_context JSONB
);
```

Implementation:
- Hash-based suggestion tracking
- Permanent dismissal tracking
- Context-aware re-suggestion rules

### 3. Advanced Relevance Scoring

#### Multi-factor Relevance:
```typescript
interface RelevanceScore {
  semantic: number;     // 0-1 semantic similarity
  temporal: number;     // 0-1 time relevance
  contextual: number;   // 0-1 context match
  userFeedback: number; // 0-1 based on similar suggestions
  final: number;        // Weighted combination
}
```

Components:
1. Semantic Relevance
   - Enhanced LLM-based similarity scoring
   - Topic cluster matching
   - Key concept alignment

2. Temporal Relevance
   - Recency weighting
   - Time-of-day context
   - Interaction frequency patterns

3. Contextual Relevance
   - User state awareness
   - Recent interaction context
   - Village network state

### 4. Context Integration Improvements

#### Enhanced Context Gathering:
```typescript
interface EnhancedContext {
  user: {
    profile: UserProfile;
    preferences: UserPreferences;
    interactionPatterns: InteractionMetrics;
  };
  village: {
    networkState: VillageMetrics;
    recentChanges: VillageChanges;
    interactionHistory: VillageInteractions;
  };
  temporal: {
    timeOfDay: string;
    userActiveHours: TimeRange[];
    lastInteractionTime: Date;
  };
}
```

Implementation:
1. User Context Layer
   - Preference tracking
   - Interaction patterns
   - Success metrics

2. Village Context Layer
   - Network health metrics
   - Interaction frequency
   - Support pattern analysis

3. Temporal Context Layer
   - Time-based relevance
   - Activity pattern matching
   - Seasonal context

### 5. Memory Type Optimization

Leverage mem0's Memory Types:

1. Episodic Memories
   ```typescript
   interface EpisodicMemory {
     type: "episodic";
     content: string;
     context: {
       timestamp: Date;
       location: string;
       participants: string[];
       emotions: EmotionMetrics;
     };
   }
   ```
   - Store user interactions
   - Track emotional context
   - Capture event sequences

2. Semantic Memories
   ```typescript
   interface SemanticMemory {
     type: "semantic";
     content: string;
     relationships: {
       concepts: string[];
       connections: Relationship[];
     };
   }
   ```
   - Store knowledge and patterns
   - Track concept relationships
   - Build knowledge graphs

3. Procedural Memories
   ```typescript
   interface ProceduralMemory {
     type: "procedural";
     content: string;
     pattern: {
       triggers: string[];
       sequence: Step[];
       outcomes: Outcome[];
     };
   }
   ```
   - Store interaction patterns
   - Track successful strategies
   - Learn from user behavior

## Implementation Phases

### Phase 1: Memory System Enhancement
1. Integrate advanced mem0 features
2. Implement memory type differentiation
3. Setup enhanced retrieval patterns

### Phase 2: Suggestion Persistence
1. Implement suggestion tracking
2. Create dismissal system
3. Setup re-suggestion rules

### Phase 3: Context Integration
1. Build context gathering system
2. Implement context scoring
3. Create feedback loops

### Phase 4: Relevance Scoring
1. Implement multi-factor scoring
2. Setup adjustment mechanisms
3. Create performance metrics

## Expected Outcomes

1. Improved Suggestion Relevance
   - 30% increase in suggestion acceptance
   - 50% reduction in dismissals
   - Higher user engagement metrics

2. Better Personalization
   - More contextual suggestions
   - Improved timing of suggestions
   - Better user satisfaction scores

3. Enhanced System Learning
   - Faster adaptation to user preferences
   - Better pattern recognition
   - Improved suggestion timing

## Monitoring and Metrics

1. Suggestion Performance
   - Acceptance rates
   - Dismissal patterns
   - User engagement metrics

2. Memory System Performance
   - Retrieval accuracy
   - Processing speed
   - Storage efficiency

3. User Satisfaction
   - Explicit feedback scores
   - Implicit engagement metrics
   - Long-term usage patterns

## Next Steps

1. Technical Implementation
   - Review current codebase
   - Plan integration points
   - Create test scenarios

2. User Experience
   - Design feedback mechanisms
   - Plan UI/UX changes
   - Create user documentation

3. System Integration
   - Plan deployment stages
   - Setup monitoring
   - Create rollback procedures
