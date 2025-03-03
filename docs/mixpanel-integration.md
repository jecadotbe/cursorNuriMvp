
# Mixpanel Integration

This document describes how Mixpanel is integrated into the Nuri application for analytics tracking.

## Setup

The Mixpanel integration is set up in `client/src/lib/mixpanel.ts`. To use it, you need to:

1. Replace `YOUR_MIXPANEL_TOKEN` with your actual Mixpanel project token
2. Import and use the Mixpanel service in your components

## Usage

### Tracking Events

```typescript
import { Mixpanel } from '@/lib/mixpanel';

// Track a simple event
Mixpanel.track('Button Clicked');

// Track an event with properties
Mixpanel.track('Article Viewed', { 
  articleId: 123,
  category: 'village',
  timeSpent: 45
});
```

### User Identification

To identify a user for tracking:

```typescript
// After successful login:
Mixpanel.setUser({
  id: 12345,
  username: 'john_doe',
  email: 'john@example.com'
});

// For anonymous user tracking (optional):
Mixpanel.identify('unique-device-id');
```

### Page View Tracking

We have a hook for tracking page views:

```typescript
import { usePageView } from '@/hooks/use-page-view';

function MyComponent() {
  // Track page view with the current URL
  usePageView();
  
  // Or with a custom name
  usePageView('Home Dashboard');
  
  return <div>...</div>;
}
```

### Reset User Identity

When a user logs out:

```typescript
Mixpanel.reset();
```

## Events Being Tracked

The following events are tracked in the application:

- **App Loaded**: When the application is first loaded
- **User Logged In**: When a user successfully logs in
- **User Logged Out**: When a user logs out
- **Page View**: When a user navigates to a new page
- **Suggestion Used**: When a user clicks on a suggestion
- **Suggestion Feedback Submitted**: When a user submits feedback for a suggestion
- **Action Chip Clicked**: When a user clicks on an action chip

## Best Practices

1. Use consistent event names (PascalCase or snake_case)
2. Include contextual properties with each event
3. Don't track personally identifiable information (PII) unless necessary
4. Test your events in development mode before deploying
