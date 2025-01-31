# Nuri Developer Documentation

## Overview
Nuri is an advanced AI-powered personal development platform that creates a comprehensive multilingual user interaction ecosystem through intelligent communication strategies. The platform delivers personalized experiences by leveraging sophisticated AI technologies.

## Tech Stack

### Frontend
- React with TypeScript
- PWA Technologies (Service Worker, Web App Manifest)
- Component Libraries: shadcn/ui
- State Management: React Query

### Backend
- Node.js with Express
- PostgreSQL with pgvector
- Drizzle ORM
- Authentication: Passport.js

### AI Integration
- LangChain.js
- Anthropic Claude Integration
- RAG Knowledge Base

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### Environment Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (see `.env.example`)
4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

### Route Organization
The application uses a modular routing structure:

```
server/routes/
├── index.ts          # Main router setup
├── auth/            # Authentication routes
├── chat/           # Chat functionality
├── profile/        # User profile management
│   ├── parent.ts
│   ├── children.ts
│   └── onboarding.ts
├── suggestions/    # AI suggestions
└── village/       # Community features
```

### Key Components
- **Authentication**: Session-based auth with Passport.js
- **File Handling**: express-fileupload with 2MB limit
- **Rate Limiting**: Applied to sensitive routes
- **Database**: Drizzle ORM with PostgreSQL

## Additional Documentation
- [API Documentation](./api/README.md)
- [Authentication Guide](./guides/authentication.md)
- [Database Schema](./guides/database.md)
- [Error Handling](./guides/error-handling.md)

## Security Considerations
- Rate limiting on authentication routes
- Session management with secure cookies
- File upload restrictions
- Request validation with Zod schemas

## Known Issues
1. TypeScript errors in suggestions module
2. Missing profile picture field in schema
3. Inconsistent error handling patterns

For detailed information, refer to specific documentation sections in the `docs` directory.
