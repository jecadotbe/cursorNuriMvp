# Error Handling Guide

## Overview
This guide establishes consistent error handling patterns for the Nuri application, covering both API and client-side error management.

## API Error Handling

### Error Structure
```typescript
interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
  stack?: string; // Only in development
}
```

### Error Types
```typescript
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

### Error Handling Middleware
```typescript
function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error(error);

  // Handle known errors
  if (error instanceof ValidationError) {
    return res.status(400).json({
      message: error.message,
      code: ErrorCode.VALIDATION_ERROR,
      details: error.details,
    });
  }

  // Default error response
  return res.status(500).json({
    message: 'Internal server error',
    code: ErrorCode.INTERNAL_ERROR,
  });
}
```

## Route Error Handling

### Using Try-Catch
```typescript
router.post('/profile', async (req, res, next) => {
  try {
    const data = await updateProfile(req.body);
    res.json(data);
  } catch (error) {
    next(createError('Failed to update profile', error));
  }
});
```

### Validation Errors
```typescript
const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      next(new ValidationError('Invalid request data', error));
    }
  };
};
```

## Database Error Handling

### Query Errors
```typescript
try {
  await db.insert(users).values(userData);
} catch (error) {
  if (error.code === '23505') { // Unique violation
    throw new ConflictError('Username already exists');
  }
  throw new DatabaseError('Database operation failed', error);
}
```

## Client-Side Error Handling

### API Request Errors
```typescript
const handleApiError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const { response } = error;
    if (response?.status === 401) {
      // Handle authentication error
      toast.error('Session expired. Please login again.');
      return;
    }
    // Handle other errors
    toast.error(response?.data?.message || 'An error occurred');
  }
};
```

### Form Validation Errors
```typescript
const handleSubmit = async (data: FormData) => {
  try {
    await validateFormData(data);
    await submitForm(data);
  } catch (error) {
    if (error instanceof ValidationError) {
      setFieldErrors(error.details);
      return;
    }
    handleApiError(error);
  }
};
```

## Error Logging

### Server-Side Logging
```typescript
const logger = {
  error: (error: Error, context?: Record<string, any>) => {
    console.error({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  }
};
```

### Client-Side Logging
```typescript
const logError = (error: Error, context?: Record<string, any>) => {
  // Send to error tracking service
  errorTracker.captureException(error, {
    extra: context,
    tags: {
      environment: process.env.NODE_ENV,
    },
  });
};
```

## Best Practices

1. Always use typed errors
2. Include relevant context in error messages
3. Log errors appropriately
4. Handle errors at the appropriate level
5. Provide user-friendly error messages
6. Use consistent error structure

## Security Considerations

1. Don't expose sensitive information in errors
2. Validate input data
3. Handle authentication errors properly
4. Log security-related errors
5. Implement rate limiting

## Testing Error Handling

### Unit Tests
```typescript
describe('Error Handler', () => {
  it('should handle validation errors', async () => {
    const error = new ValidationError('Invalid data');
    const response = await handleError(error);
    expect(response.status).toBe(400);
  });
});
```

For specific API error responses, refer to the [API Documentation](../api/README.md).
