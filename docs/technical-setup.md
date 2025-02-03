# Nuri Technical Setup Documentation

## Project Overview
Nuri is an intelligent personal development platform that leverages AI for creating meaningful, adaptive community interactions through sophisticated suggestion technologies. The platform transforms complex community management into intuitive, personalized experiences by integrating cutting-edge AI recommendation systems.

## Core Architecture

### Frontend Stack
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **Form Management**: React Hook Form with Zod validation
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Markdown Processing**: react-markdown
- **Component Library**: Radix UI primitives

### Backend Stack
- **Runtime**: Node.js
- **Server Framework**: Express.js
- **Database**: PostgreSQL with pgvector for vector embeddings
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js
- **Session Management**: express-session with memorystore

### AI Integration
- **Framework**: LangChain.js
- **Models**: Anthropic Claude 3.5 Sonnet
- **Vector Database**: pgvector for embeddings storage

## Dependencies Breakdown

### Frontend Dependencies
```json
{
  "dependencies": {
    "@hookform/resolvers": "latest",
    "@radix-ui/*": "latest",
    "@tanstack/react-query": "latest",
    "react": "latest",
    "react-dom": "latest",
    "react-hook-form": "latest",
    "wouter": "latest",
    "zod": "latest",
    "lucide-react": "latest",
    "tailwindcss": "latest",
    "tailwindcss-animate": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  }
}
```

### Backend Dependencies
```json
{
  "dependencies": {
    "express": "latest",
    "express-session": "latest",
    "passport": "latest",
    "passport-local": "latest",
    "drizzle-orm": "latest",
    "drizzle-zod": "latest",
    "@neondatabase/serverless": "latest",
    "pg": "latest",
    "memorystore": "latest"
  }
}
```

### AI and ML Dependencies
```json
{
  "dependencies": {
    "langchain": "latest",
    "@langchain/core": "latest",
    "@langchain/community": "latest",
    "@anthropic-ai/sdk": "latest"
  }
}
```

### Development Dependencies
```json
{
  "devDependencies": {
    "typescript": "latest",
    "vite": "latest",
    "@vitejs/plugin-react": "latest",
    "drizzle-kit": "latest",
    "@types/express": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "autoprefixer": "latest",
    "postcss": "latest",
    "tailwindcss": "latest",
    "jest": "latest",
    "ts-jest": "latest",
    "@types/jest": "latest",
    "supertest": "latest",
    "@types/supertest": "latest"
  }
}
```

## Database Setup

### PostgreSQL Configuration
- Database: PostgreSQL with pgvector extension
- Connection: Uses connection pooling via `@neondatabase/serverless`
- Schema management: Drizzle ORM with automatic migrations
- Vector storage: pgvector for embedding storage and similarity search

### Environment Variables
Required environment variables:
```
DATABASE_URL=postgresql://user:password@host:port/database
ANTHROPIC_API_KEY=your_anthropic_api_key
SESSION_SECRET=your_session_secret
```

## Project Structure
```
.
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable React components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── lib/        # Utility functions and constants
│   │   ├── pages/      # Page components
│   │   └── App.tsx     # Main application component
├── server/              # Backend Express application
│   ├── routes/         # API route handlers
│   ├── middleware/     # Express middleware
│   └── services/       # Business logic services
├── db/                  # Database related files
│   ├── schema.ts       # Drizzle schema definitions
│   └── migrations/     # Database migrations
├── public/             # Static assets
└── docs/               # Documentation
```

## Development Guidelines

### Frontend Development
1. Use Wouter for routing
2. Implement forms with react-hook-form and Zod validation
3. Use TanStack Query for data fetching
4. Follow shadcn/ui component patterns
5. Implement responsive designs using Tailwind CSS

### Backend Development
1. Follow RESTful API design principles
2. Use Drizzle ORM for database operations
3. Implement proper error handling and validation
4. Use TypeScript for type safety
5. Follow Express.js best practices

### Database Management
1. Use Drizzle migrations for schema changes
2. Implement proper indexing for performance
3. Use pgvector for embedding storage
4. Follow database normalization principles

### AI Integration
1. Use LangChain.js for AI operations
2. Implement proper error handling for API calls
3. Use vector embeddings for similarity search
4. Cache API responses when appropriate

### Testing
1. Write unit tests with Jest
2. Implement integration tests with Supertest
3. Follow TDD practices
4. Maintain good test coverage

## Migration Notes
When migrating from Replit:
1. Set up a new PostgreSQL database with pgvector extension
2. Configure environment variables in the new environment
3. Run database migrations using Drizzle
4. Set up development and production environments
5. Configure CI/CD pipelines if needed
6. Update API endpoints and configurations
7. Test thoroughly in the new environment

## Production Deployment
1. Set up proper environment variables
2. Configure production database
3. Set up proper logging
4. Configure proper security measures
5. Set up monitoring and analytics
6. Configure proper caching strategies
7. Set up backup procedures

This documentation provides a comprehensive overview of the technical setup. For specific deployment instructions or environment-specific configurations, please refer to the relevant platform's documentation.
