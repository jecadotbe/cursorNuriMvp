# Database Documentation

## Overview
The application uses PostgreSQL with Drizzle ORM for database operations. This guide covers the database schema, relationships, and how to work with the database.

## Schema Structure

### Core Tables

#### Users
```typescript
users {
  id: serial (PK)
  username: text (unique)
  email: text
  password: text
  profilePicture: text?
  createdAt: timestamp
}
```

#### Parent Profiles
```typescript
parentProfiles {
  id: serial (PK)
  userId: integer (FK -> users.id)
  name: text
  email: text?
  stressLevel: enum('low', 'moderate', 'high', 'very_high')
  experienceLevel: enum('first_time', 'experienced', 'multiple_children')
  primaryConcerns: text[]
  supportNetwork: text[]
  bio: text?
  preferredLanguage: text (default: 'nl')
  communicationPreference: text?
  completedOnboarding: boolean
  currentOnboardingStep: integer
  onboardingData: jsonb
  profileEmbedding: text
  lastSuggestionCheck: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Child Profiles
```typescript
childProfiles {
  id: serial (PK)
  parentProfileId: integer (FK -> parentProfiles.id)
  name: text
  age: integer
  specialNeeds: text[]
  routines: jsonb
  developmentNotes: text?
  lastAssessment: timestamp?
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Relationships

### Key Relations
1. User -> Parent Profile (One-to-One)
2. Parent Profile -> Child Profiles (One-to-Many)
3. Parent Profile -> Parenting Goals (One-to-Many)

## Working with the Database

### Environment Setup
```bash
# Required environment variables
DATABASE_URL=postgresql://user:password@host:port/database
```

### Using Drizzle ORM
```typescript
// Import the db instance
import { db } from "@db/index";

// Import schemas
import { users, parentProfiles, childProfiles } from "@db/schema";

// Example query
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    parentProfile: true,
    childProfiles: true
  }
});
```

### Schema Validation
The application uses Zod schemas for validation:

```typescript
// Import validation schemas
import {
  insertParentProfileSchema,
  selectParentProfileSchema
} from "@db/schema";

// Validate data
const validatedData = insertParentProfileSchema.parse(requestBody);
```

## Migrations

### Running Migrations
```bash
# Generate migrations
npm run db:generate

# Push schema changes
npm run db:push
```

## Best Practices
1. Always use Drizzle for database operations
2. Validate input data using Zod schemas
3. Use transactions for related operations
4. Follow the established naming conventions
5. Document schema changes in migrations

## Common Issues
1. Remember to push schema changes after modifications
2. Use proper index naming conventions
3. Handle nullable fields appropriately
4. Validate foreign key constraints

## Security Considerations
1. Never expose database credentials
2. Use parameterized queries
3. Implement proper access control
4. Regular database backups
5. Monitor query performance

For detailed API documentation, refer to the [API Documentation](../api/README.md) section.
