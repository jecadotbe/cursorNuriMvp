# Nuri App PWA Implementation

This document outlines the implementation of Progressive Web App (PWA) features in the Nuri App, including push notifications.

## Features Implemented

1. **Web App Manifest**: Enables "Add to Home Screen" functionality
2. **Service Worker**: Provides offline capabilities and push notification handling
3. **Push Notifications**: Allows sending notifications to users even when the app is closed
4. **Notification Preferences**: Allows users to customize which notifications they receive
5. **Contextual Notifications**: Different types of notifications for different app features

## Implementation Details

### Web App Manifest

The `manifest.json` file in the public directory defines the app's appearance when installed:

```json
{
  "name": "Nuri App",
  "short_name": "Nuri",
  "description": "Personalized parenting support with AI assistance",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4f46e5",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Service Worker

The service worker (`public/service-worker.js`) handles:
- Caching for offline use
- Push notification reception
- Notification click events

### Push Notifications

#### Server-Side Components

1. **Database Schema**: 
   - Added `pushSubscriptions` field to store push subscription data
   - Added `notificationPreferences` field to store user preferences

2. **Notification Service**: A singleton service that handles:
   - Sending notifications to users
   - Checking notification preferences
   - Formatting different types of notifications

3. **API Routes**: 
   - `/api/notifications/vapid-public-key` - Provides the VAPID public key to clients
   - `/notifications/subscribe` - Stores push subscriptions
   - `/notifications/send-test` - Sends test notifications
   - `/api/notifications/preferences` - Gets/sets notification preferences

#### Client-Side Components

1. **NotificationPermission**: UI component to request notification permission
2. **NotificationTest**: UI component to test push notifications
3. **NotificationPreferences**: UI component to manage notification settings

### Notification Types

The app supports several types of notifications:

1. **Chat Notifications**: Sent when a user receives a new message
2. **Reminder Notifications**: Sent for scheduled reminders
3. **Village Update Notifications**: Sent when there are changes to the user's support network

## How to Use

### For Users

1. Visit the Nuri App in a supported browser
2. The app will prompt to enable notifications
3. After enabling, users can customize notification preferences in their profile
4. Users will receive notifications based on their preferences

### For Developers

1. **Environment Setup**:
   - Generate VAPID keys: `npx web-push generate-vapid-keys`
   - Add keys to `.env` file:
     ```
     VAPID_PUBLIC_KEY=your_public_key
     VAPID_PRIVATE_KEY=your_private_key
     ```

2. **Sending Notifications**:
   ```typescript
   // Example code to send a notification
   await notificationService.sendChatNotification(
     userId,
     "Nuri",
     messageContent,
     chatId
   );
   ```

3. **Creating Reminders**:
   ```typescript
   // Example code to create a reminder
   await reminderService.scheduleReminder(
     userId,
     'Reminder Title',
     'Reminder Description',
     scheduledTime,
     '/target-url'
   );
   ```

## Integration Points

The notification system is integrated with several app features:

1. **Chat System**: Sends notifications for new messages
2. **Reminder System**: Analyzes messages for reminder keywords and schedules notifications
3. **Village System**: Sends notifications for village updates

## Future Enhancements

1. **Rich Notifications**: Add images and action buttons to notifications
2. **Scheduled Notifications**: Improve the reminder system with more sophisticated scheduling
3. **Offline Support**: Enhance the service worker to provide better offline experience
4. **Background Sync**: Implement background sync for offline actions

## Troubleshooting

- **Notifications Not Working**: Check browser permissions and service worker registration
- **Service Worker Not Updating**: Clear browser cache and reload
- **Subscription Failures**: Verify VAPID keys are correctly configured
- **Database Migration Issues**: Run `npx drizzle-kit push` to apply schema changes 