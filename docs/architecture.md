# Nuri - AI-Powered Personal Development Platform

## Table of Contents
1. [Overview](#overview)
2. [Core Architecture](#core-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Schema](#database-schema)
6. [AI Integration](#ai-integration)
7. [Security Features](#security-features)
8. [Advanced Features](#advanced-features)

## Overview

Nuri is an advanced AI-powered personal development platform designed to create a comprehensive multilingual user interaction ecosystem through intelligent communication strategies. The platform delivers personalized experiences by leveraging sophisticated AI technologies, with a focus on modular architecture, robust security, and adaptive support.

### Technology Stack
- **Frontend**: React, TypeScript, react-markdown
- **PWA Technologies**: Service Worker, Web App Manifest
- **AI Integration**: LangChain.js, Anthropic Claude 3.5 Sonnet, RAG Knowledge Base
- **Backend**: PostgreSQL with pgvector, Drizzle ORM, Neon Database
- **Security**: Express rate limiting, Middleware-based authentication
- **Core Capabilities**: Multilingual support, Adaptive content personalization, Robust error handling

## Core Architecture

### Frontend (React + TypeScript)
- Built with React and TypeScript using Vite as the build tool
- Uses ShadCN UI components with custom Tailwind theming
- Implements a PWA architecture
- Uses wouter for routing and @tanstack/react-query for data fetching
- Organized into modular pages including chat, profile, village, and learning sections

### Backend (Express + TypeScript)
- Express.js server with TypeScript
- Modular routing system with separate route handlers
- Session-based authentication
- Rate limiting and security middleware

### Database (PostgreSQL)
- Uses Drizzle ORM with PostgreSQL
- Vector embeddings for AI features
- Comprehensive schema for all platform features

## Frontend Architecture

### Routing Structure
```typescript
// Main Routes
- Authentication: `/auth`
- Onboarding: `/onboarding`, `/building-profile`
- Main Features:
  - Home: `/`
  - Chat: `/chat`, `/chat/:id`, `/chat/history`
  - Village: `/village`
  - Learning: `/learn`, `/learn/:id`
  - Profile: `/profile`, `/profile/edit`
```

### Key Components

#### Village Feature
- Interactive visualization with zoom/pan
- Member management (add/edit/delete)
- Circle-based relationship mapping
- Memory tracking for relationships
- Insights and suggestions

#### Chat Interface
- Real-time message handling
- AI-powered responses
- Context-aware suggestions
- Message history view

#### Profile Management
- Multi-step onboarding
- Profile customization
- Progress tracking
- Goal setting

## Backend Architecture

### API Routes

```typescript
1. Authentication Routes (/api/auth):
   - Login/Register
   - Session management
   - Profile verification

2. Chat Routes (/api/chat):
   - Message handling
   - Chat history
   - AI integration
   - Contextual suggestions

3. Profile Routes (/api/profile):
   - Parent profiles
   - Child profiles
   - Onboarding flow

4. Village Routes (/api/village):
   - Community management
   - Member interactions
   - Memory tracking
   - Support network visualization
```

## Database Schema

### Core User Data
```typescript
Users:
  - Basic authentication (id, username, email, password)
  - Profile picture and creation timestamp
  - Unique constraints on username

Parent Profiles:
  - Linked to user_id
  - Stress level tracking (low/moderate/high/very_high)
  - Experience level (first_time/experienced/multiple_children)
  - Language and communication preferences
  - Onboarding progress tracking
  - Vector embeddings for AI matching
```

### Support Network
```typescript
Village Members:
  - Hierarchical circle-based organization
  - Category classification (informeel/formeel/inspiratie)
  - Contact frequency tracking (S/M/L/XL)
  - Position metadata for visualization
  
Village Interactions & Memories:
  - Timestamped interaction tracking
  - Quality metrics and duration
  - Emotional impact assessment
  - Rich metadata storage
```

## AI Integration

### Chat System Architecture
```typescript
- Claude 3.5 Sonnet integration for responses
- RAG-enhanced context management
- Memory service integration
- Dynamic prompt construction with:
  - Village context
  - Historical interactions
  - Relevant book excerpts
```

### Memory Service Architecture
```typescript
Memory Management (mem0ai integration):
  - Persistent conversation tracking
  - Context-aware memory retrieval
  - Emotional impact scoring
  - Cached memory access for performance
  - Memory categorization by:
    - Source (nuri-chat, village-interaction)
    - Type (conversation, interaction)
    - Category (chat_history, relationship_memory)

Retrieval-Augmented Generation (RAG):
  - PostgreSQL vector store with pgvector
  - OpenAI text-embedding-3-large model
  - Similarity search capabilities
  - Contextual book knowledge integration
  - Real-time content enrichment for chat
```

## Security Features

- Session-based authentication
- CSRF protection
- Secure cookie handling
- Rate limiting
- Input validation using Zod
- Middleware-based security checks
- Environment variable management
- API key protection

## Advanced Features

### Response Pattern System
```typescript
Pattern Types:
  - DIRECT: Clear, straightforward communication
  - REFLECTIVE: Emotional mirroring and validation
  - STORY_BASED: Example-driven guidance
  - COLLABORATIVE: Interactive problem-solving

Response Structures:
  - VALIDATE_FIRST: Emotional validation before advice
  - PRACTICAL_FIRST: Action-oriented guidance
  - SCENARIO_BASED: Multiple perspective analysis
  - STEP_BY_STEP: Sequential guidance

Dynamic Adaptation:
  - Communication preference mapping
  - Contextual pattern selection
  - User feedback integration
  - Progressive refinement
```

### Insights System
```typescript
Types of Insights:
  - connection_strength: Relationship quality analysis
  - network_gap: Support network optimization
  - interaction_suggestion: Engagement recommendations
  - relationship_health: Support quality metrics

Features:
  - Priority-based presentation
  - Action-oriented suggestions
  - Interactive implementation
  - Progress tracking
  - Dismissal management
```

### Progressive Data Collection
```typescript
Onboarding Goals:
  - Short and long-term goal tracking
  - Support area identification
  - Communication preference mapping
  
Parenting Challenges:
  - Severity and frequency tracking
  - Impact assessment
  - Status monitoring
```

This documentation provides a comprehensive overview of Nuri's architecture and technical implementation. For specific implementation details or additional technical documentation, please refer to the inline code comments and related configuration files.
