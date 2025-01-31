# Route Modularization Guide

## Overview
This guide covers the route organization structure implemented in Nuri, explaining how routes are modularized and how to add new route modules.

## Directory Structure
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

## Route Module Structure

### Main Router (index.ts)
The main router file connects all route modules and handles top-level middleware:

```typescript
import { Router } from 'express';
import { authRouter } from './auth';
import { chatRouter } from './chat';
import { profileRouter } from './profile';
import { villageRouter } from './village';
import { suggestionsRouter } from './suggestions';

const router = Router();

router.use('/auth', authRouter);
router.use('/chat', chatRouter);
router.use('/profile', profileRouter);
router.use('/village', villageRouter);
router.use('/suggestions', suggestionsRouter);

export default router;
```

### Module Structure
Each route module should follow this structure:

```typescript
// Example: profile/parent.ts
import { Router } from 'express';
import { z } from 'zod';
import { db } from '@db/index';
import { parentProfiles } from '@db/schema';

const router = Router();

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  // ... other fields
});

// Routes
router.get('/', async (req, res) => {
  // Implementation
});

router.post('/', async (req, res) => {
  // Implementation
});

export default router;
```

## Best Practices

### 1. Route Organization
- Group related routes in modules
- Use descriptive file names
- Keep route handlers focused
- Implement proper error handling

### 2. Middleware Usage
```typescript
// Authentication middleware
router.use(isAuthenticated);

// Rate limiting
router.use(rateLimiter);

// Request validation
router.use(validateRequest);
```

### 3. Error Handling
```typescript
try {
  // Route logic
} catch (error) {
  next(createError('Route-specific error message', error));
}
```

### 4. Request Validation
```typescript
router.post('/', async (req, res) => {
  const validatedData = updateProfileSchema.parse(req.body);
  // Process validated data
});
```

## Adding New Routes

### 1. Create Module Directory
```bash
mkdir server/routes/new-feature
```

### 2. Create Route Files
```typescript
// new-feature/index.ts
import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

router.use(isAuthenticated);

// Add routes
router.get('/', async (req, res) => {
  // Implementation
});

export default router;
```

### 3. Register in Main Router
```typescript
// routes/index.ts
import { newFeatureRouter } from './new-feature';
router.use('/new-feature', newFeatureRouter);
```

## Testing Routes

### 1. Unit Tests
```typescript
describe('Profile Routes', () => {
  it('should return profile data', async () => {
    // Test implementation
  });
});
```

### 2. API Testing
Use tools like Postman or curl to test endpoints:
```bash
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer token"
```

## Common Issues and Solutions

### 1. Authentication Issues
- Ensure middleware order is correct
- Verify token validation
- Check session configuration

### 2. Validation Errors
- Use proper Zod schemas
- Handle validation errors consistently
- Provide clear error messages

### 3. Route Conflicts
- Check for duplicate routes
- Verify middleware chain
- Debug route parameters

## Security Considerations
1. Implement proper authentication
2. Use rate limiting
3. Validate input data
4. Handle sensitive information
5. Implement proper CORS settings

For more details on specific implementations, refer to the respective module documentation in the `docs/api` directory.
