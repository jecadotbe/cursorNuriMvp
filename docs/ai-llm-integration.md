# AI/LLM Integration in Nuri

## Overview

Nuri leverages advanced AI capabilities through multiple integrated systems:
1. Anthropic Claude API for intelligent chat responses
2. RAG (Retrieval Augmented Generation) for contextual knowledge
3. Memory system for personalized interactions
4. AI-powered suggestion generation

## Core Components

### 1. RAG System (`server/rag.ts`)

The RAG system enhances responses with relevant knowledge:

```typescript
// Embeddings configuration
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
  apiKey: process.env.OPENAI_API_KEY,
});

// Vector store initialization
const vectorStore = await NeonPostgres.initialize(embeddings, {
  tableName: "langchain_pg_embedding",
  columns: {
    idColumnName: "id",
    vectorColumnName: "embedding",
    contentColumnName: "document",
    metadataColumnName: "cmetadata",
  },
});
```

Key features:
- Uses OpenAI's text-embedding-3-large model
- Stores embeddings in PostgreSQL with pgvector
- Enables semantic search across content

### 2. Anthropic Integration (`server/lib/suggestion-generator.ts`)

Nuri uses Claude 3.5 Sonnet for generating contextual responses:

```typescript
const response = await anthropic.messages.create({
  messages: [{ role: "user", content: prompt }],
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1000,
  temperature: 0.7,
});
```

Key aspects:
- Utilizes Claude 3.5 Sonnet model for high-quality responses
- Implements temperature control for response variety
- Handles structured outputs via JSON formatting

### 3. Memory System (`server/services/memory`)

The memory system maintains context and personalizes interactions:

1. Storage:
   - Stores interaction memories in PostgreSQL
   - Associates metadata for relevance tracking
   - Implements memory decay over time

2. Retrieval:
   ```typescript
   const memories = await memoryService.getRelevantMemories(
     userId,
     chatContext,
   );
   ```

3. Integration with Chat:
   ```typescript
   // Save conversation fragments into memory
   await memoryService.createMemory(user.id, lastMessage, {
     role: "user",
     chatId: req.body.chatId || "new",
     source: "nuri-chat",
     type: "conversation",
     category: "chat_history",
   });
   ```

### 4. Suggestion Generation System

Located in `server/lib/suggestion-generator.ts`, this system creates personalized suggestions:

1. Context Gathering:
   ```typescript
   const villageContext = {
     recentChats,
     parentProfile,
     childProfiles,
     challenges,
     memories,
   };
   ```

2. Analysis Phases:
   - Village network structure analysis
   - Recent conversation context processing
   - Memory retrieval and relevance scoring
   - Suggestion generation using Claude

3. Suggestion Types:
   - Network growth
   - Village maintenance
   - Network expansion

## Integration Flow

1. **User Input Processing**:
   ```typescript
   // 1. Retrieve contextual data
   const profile = await db.query.parentProfiles.findFirst({...});
   const villageContext = await getVillageContext(user.id);
   
   // 2. Get relevant knowledge
   const ragContext = await searchBooks(lastMessage, 2);
   
   // 3. Fetch relevant memories
   const relevantMemories = await memoryService.getRelevantMemories(
     user.id,
     lastMessage,
   );
   ```

2. **Context Assembly**:
   ```typescript
   const mainPrompt = `
     ${NURI_SYSTEM_PROMPT}
     
     CONTEXT:
     1. Village Context: ${villageContextString}
     2. Conversation History: ${memoryContext}
     3. Retrieved Content: ${mergedRAG}
   `;
   ```

3. **Response Generation**:
   ```typescript
   const response = await anthropic.messages.create({
     model: "claude-3-5-sonnet-20241022",
     max_tokens: 512,
     temperature: 0.4,
     system: mainPrompt,
     messages: req.body.messages,
   });
   ```

4. **Memory Integration**:
   - Stores user messages and AI responses
   - Updates relevance scores
   - Maintains conversation context

## Performance Considerations

1. **Caching Strategy**:
   - Implements stale-while-revalidate pattern
   - Caches suggestions with expiration
   - Optimizes memory retrieval

2. **Rate Limiting**:
   - Implements backoff for API calls
   - Pools similar requests
   - Manages token usage

3. **Error Handling**:
   - Graceful degradation with default responses
   - Retries for transient failures
   - Comprehensive error logging

## Configuration

Key environment variables:
- `ANTHROPIC_API_KEY`: For Claude API access
- `OPENAI_API_KEY`: For embeddings generation
- `DATABASE_URL`: For PostgreSQL with pgvector

## Monitoring and Debugging

The system provides comprehensive logging:
- API call tracking
- Memory system performance
- Suggestion generation metrics
- Error reporting and tracking

## Future Improvements

Planned enhancements:
1. Multi-modal support with Claude 3.5
2. Enhanced memory pruning and relevance scoring
3. Expanded suggestion categories
4. Improved context window management
