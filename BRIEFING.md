# Route Modularization Project Briefing

## Current State
- Main routing setup exists in `server/routes/index.ts`
- Route modules have been created in `server/routes/profile/`
- Onboarding routes moved to profile module
- Basic structure for modular routing is in place

## Work Done
1. Created modular structure for routes:
   - /routes/index.ts (main router setup)
   - /routes/profile/index.ts (profile router)
   - /routes/auth/index.ts (auth routes)
   - /routes/chat/index.ts (chat routes) 
   - /routes/village/index.ts (village routes)
   - /routes/suggestions/index.ts (suggestions)

2. Created profile-related route modules:
   - /routes/profile/parent.ts
   - /routes/profile/children.ts 
   - /routes/profile/onboarding.ts

3. Moved onboarding routes into profile module for better organization

## Next Steps
1. Review and fix TypeScript errors in:
   - server/routes/suggestions/index.ts
   - server/routes/profile/parent.ts
   - server/routes/profile/children.ts
   - server/routes/profile/onboarding.ts

2. Move chat functionality from routes.ts to chat module:
   - Implement message handling
   - Add context management
   - Move anthropic integration

3. Implement route authorization middleware consistently across modules

4. Add proper error handling and validation:
   - Use zod schemas from db/schema.ts
   - Add request validation middleware
   - Implement consistent error responses

5. Clean up duplicated code:
   - Move shared utilities to common location
   - Create reusable middleware
   - Extract common type definitions

## Known Issues
1. LSP Issues in suggestions/index.ts:
   - Property 'childProfiles' does not exist on type '{}'
   - Property 'goals' does not exist on type '{}'
   - Insert overload errors

2. Missing profile picture field in parentProfiles schema

3. Inconsistent error handling across routes

## Dependencies & Considerations
1. Schema Dependencies:
   - Uses drizzle-orm for database operations
   - Zod schemas available in db/schema.ts
   - Need to maintain schema consistency

2. Authentication:
   - Uses Passport.js for authentication
   - Session-based auth with express-session
   - Rate limiting applied to auth routes

3. File Handling:
   - express-fileupload middleware for file uploads
   - 2MB file size limit
   - Uploads stored in public/uploads

4. External Services:
   - Anthropic API for AI interactions
   - Memory service for context management
   - Village context integration

## Testing Requirements
1. Verify authentication flows
2. Test file upload functionality
3. Ensure proper rate limiting
4. Validate API responses
5. Check database operations

## Next Agent Instructions
1. Start with fixing TypeScript errors in existing modules
2. Implement proper error handling
3. Add request validation
4. Move chat functionality to dedicated module
5. Test thoroughly after each major change

## Notes
- Keep existing functionality while improving structure
- Maintain TypeScript type safety
- Follow RESTful API principles
- Use consistent error handling
