# Village Memory System Documentation

## Overview

The Village Memory System is a core component of Nuri that combines village member data with contextual memories to generate personalized suggestions. This document details the complete flow from data storage to suggestion generation.

## 1. Data Storage

### 1.1 Village Members Storage

Village members are stored in a PostgreSQL database with the following schema:

```sql
CREATE TABLE village_members (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  role TEXT NOT NULL,
  circle INTEGER NOT NULL,
  category member_category_enum NOT NULL,
  contact_frequency contact_frequency_enum NOT NULL,
  position_angle NUMERIC,
  metadata JSONB,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

Key features:
- Circle-based organization (1-4 representing closeness)
- Flexible metadata storage using JSONB
- Position tracking for visual representation
- Contact frequency tracking for engagement suggestions

### 1.2 Memory Storage

Memories are stored using the Mem0 API service, which provides:
- Vector embeddings for semantic search
- Relevance scoring
- Temporal organization
- Context association

Memory structure:
```typescript
interface Memory {
  id: string;
  content: string;
  metadata?: {
    source: string;
    type: string;
    category: string;
    timestamp: string;
  };
  createdAt: Date;
  relevance?: number;
}
```

### 1.3 Memory Categories

We store different types of memories:
1. Chat History
   - User conversations
   - AI responses
   - Interaction patterns

2. Onboarding Data
   - Initial assessments
   - Parent profiles
   - Child information
   - Family goals

3. Village Interactions
   - Support network activities
   - Relationship dynamics
   - Contact patterns

## 2. Suggestion Generation Process

### 2.1 Data Collection

The suggestion generator combines multiple data sources:

```typescript
interface VillageContext {
  recentChats: ChatWithMessages[];
  parentProfile: ParentProfile;
  childProfiles: ChildProfile[];
  challenges: ParentingChallenge[];
  memories: Memory[];
}
```

### 2.2 Memory Retrieval

Memory retrieval is handled by the MemoryService:

```typescript
const memories = await memoryService.getRelevantMemories(
  userId,
  chatContext,
  'suggestion'
);
```

Key features:
- Relevance thresholds (suggestion: 0.3, chat: 0.15)
- Context-based search
- Recent memory prioritization
- Cache management (60-second TTL)

### 2.3 Village Analysis

The system analyzes the village structure:

```typescript
const gaps = analyzeVillageGaps(members);
const circlesMap = gaps.circles || new Map();
```

Checks performed:
- Inner circle minimums
- Support network diversity
- Contact frequency patterns
- Role distribution

### 2.4 Suggestion Generation

The generation process follows these steps:

1. Context Assembly
```typescript
const chatContext = recentChats
  .slice(0, 3)
  .flatMap((chat) => chat.messages)
  .filter((msg) => msg.role === "user")
  .map((msg) => msg.content)
  .join(" ");
```

2. Memory Integration
```typescript
const relevantMemories = memories
  .map((m) => m.content)
  .join(". ");
```

3. AI Generation
```typescript
const response = await anthropic.messages.create({
  messages: [{ role: "user", content: prompt }],
  model: "claude-3-sonnet-20240229",
  temperature: 0.7,
});
```

### 2.5 Suggestion Storage

Generated suggestions are stored in the `prompt_suggestions` table:

```sql
CREATE TABLE prompt_suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  type TEXT NOT NULL,
  context TEXT NOT NULL,
  relevance INTEGER NOT NULL,
  related_chat_id INTEGER,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 3. Usage Examples

### 3.1 Retrieving Village Members

```typescript
const members = await db.query.villageMembers.findMany({
  where: eq(villageMembers.userId, user.id),
});
```

### 3.2 Generating Suggestions

```typescript
const suggestions = await generateVillageSuggestions(
  userId,
  members,
  {
    recentChats,
    parentProfile,
    childProfiles,
    challenges,
    memories: []
  },
  memoryService
);
```

### 3.3 Accessing Suggestions

```typescript
const { suggestions, isLoading, refetch } = useVillageSuggestions({
  autoRefresh: true,
  refreshInterval: 300000, // 5 minutes
  maxSuggestions: 5
});
```

## 4. Performance Considerations

1. Memory Service
   - 60-second cache for memory queries
   - Batch memory creation
   - Relevance thresholds to limit results

2. Database Queries
   - Indexed fields for village members
   - Efficient joins for related data
   - Connection pooling

3. Suggestion Generation
   - 24-hour suggestion expiration
   - Background generation process
   - Cached village analysis

## 5. Error Handling

1. Memory Service Failures
   - Fallback to recent chat context
   - Default suggestions when generation fails
   - Error logging and monitoring

2. Database Operations
   - Foreign key constraints
   - Transaction management
   - Cascade operations where appropriate

3. Suggestion Generation
   - Rate limiting
   - Timeout handling
   - Format validation

## 6. Future Improvements

1. Memory System
   - Enhanced vector search capabilities
   - Multi-modal memory storage
   - Improved relevance scoring

2. Suggestion Generation
   - Adaptive generation frequency
   - Personalized relevance thresholds
   - Multi-language support
   - A/B testing framework

3. Village Analysis
   - Network health scoring
   - Predictive maintenance
   - Impact assessment
