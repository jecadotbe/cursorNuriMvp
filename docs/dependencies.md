# Nuri Dependencies and API Keys Documentation

## Core Dependencies

### Frontend Dependencies
```typescript
// React and Core UI
- react
- react-dom
- @vitejs/plugin-react
- vite
- typescript
- tailwindcss
- framer-motion

// UI Components
- @radix-ui/* (Various UI primitives)
- lucide-react (Icons)
- class-variance-authority
- tailwind-merge
- clsx

// Forms and Validation
- react-hook-form
- @hookform/resolvers
- zod

// Routing and State Management
- wouter
- @tanstack/react-query

// Date Handling
- date-fns

// Data Visualization
- d3
- recharts
- embla-carousel-react

// Markdown and Content
- marked
- @tailwindcss/typography
```

### Backend Dependencies
```typescript
// Server
- express
- express-session
- express-fileupload
- memorystore
- http-proxy-middleware

// Authentication
- passport
- passport-local

// Database
- @neondatabase/serverless
- drizzle-orm
- drizzle-kit
- drizzle-zod
- pg

// AI and Language Processing
- @anthropic-ai/sdk
- langchain
- @langchain/core
- @langchain/community
- openai
- mem0ai
```

### Development Dependencies
```typescript
// Testing
- jest
- ts-jest
- @types/jest
- supertest
- @types/supertest

// TypeScript Types
- @types/react
- @types/react-dom
- @types/node
- @types/express
- @types/express-session
- @types/passport
- @types/passport-local
- @types/ws
- @types/d3
```

## Required API Keys and Secrets

The following API keys need to be configured in the application's environment:

```typescript
Essential API Keys:
1. ANTHROPIC_API_KEY
   - Purpose: Integration with Claude AI
   - Provider: Anthropic
   - Required for: AI-powered chat responses

2. OPENAI_API_KEY
   - Purpose: Text embeddings and RAG
   - Provider: OpenAI
   - Required for: Knowledge base integration

3. MEM0AI_API_KEY
   - Purpose: Memory and context management
   - Provider: mem0.ai
   - Required for: Long-term memory features

Database Credentials:
1. DATABASE_URL
   - Purpose: PostgreSQL connection
   - Provider: Neon Database
   - Format: postgresql://user:password@host:port/database

Optional API Keys:
1. SPOTIFY_API_KEY (if implementing podcast integration)
   - Purpose: Podcast playback
   - Provider: Spotify
   - Required for: Learning content delivery
```

## Setting Up API Keys

To configure these API keys:

1. Use the Replit Secrets tool to set the required environment variables
2. Follow this format for each secret:
   ```bash
   KEY_NAME="your-api-key-here"
   ```

3. Verify secrets are properly set using:
   ```typescript
   import { check_secrets } from "@/lib/secrets";
   check_secrets([
     "ANTHROPIC_API_KEY",
     "OPENAI_API_KEY",
     "MEM0AI_API_KEY",
     "DATABASE_URL"
   ]);
   ```

Note: Never commit API keys to version control. Always use environment variables or secure secret management systems.
