# Authentication API Documentation

## Overview
Authentication in Nuri is handled through session-based authentication using Passport.js. The system supports local authentication with username and password.

## Endpoints

### Register User
```http
POST /api/register
```

Creates a new user account.

#### Request Body
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### Response
```json
{
  "message": "Registration successful",
  "user": {
    "id": "number",
    "username": "string",
    "email": "string",
    "profilePicture": "string | null"
  }
}
```

### Login
```http
POST /api/login
```

Authenticates a user and creates a session.

#### Request Body
```json
{
  "username": "string",
  "password": "string",
  "rememberMe": "boolean?"
}
```

#### Response
```json
{
  "message": "Login successful",
  "user": {
    "id": "number",
    "username": "string",
    "email": "string",
    "profilePicture": "string | null"
  }
}
```

### Logout
```http
POST /api/logout
```

Ends the user's session.

#### Response
```json
{
  "message": "Logout successful"
}
```

### Get Current User
```http
GET /api/user
```

Returns the currently authenticated user's information.

#### Response
```json
{
  "id": "number",
  "username": "string",
  "email": "string",
  "profilePicture": "string | null"
}
```

## Security Features

### Session Configuration
- Secure cookie settings in production
- Session expiration: 24 hours (default)
- Remember Me: extends session to 30 days
- CSRF protection through SameSite cookie policy

### HTTP Security Headers
```javascript
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
}
```

### Rate Limiting
Authentication endpoints are protected by rate limiting to prevent brute force attacks.

## Error Responses

### 400 Bad Request
```json
{
  "message": "Username and password are required"
}
```

### 401 Unauthorized
```json
{
  "message": "Not logged in"
}
```

### 500 Server Error
```json
{
  "message": "Internal server error message"
}
```

## Best Practices
1. Always use HTTPS in production
2. Implement proper error handling
3. Validate input data
4. Monitor failed login attempts
5. Use secure password hashing (currently using scrypt)
