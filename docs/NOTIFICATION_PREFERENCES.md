# Notification Preferences Implementation

This document outlines the implementation of notification preferences in the Nuri App.

## Overview

The notification preferences feature allows users to customize which types of notifications they receive and when they receive them. This includes:

- Enabling/disabling notifications overall
- Configuring specific notification types (chat, reminders, village updates, system)
- Setting quiet hours during which notifications are not sent

## Database Schema

The notification preferences are stored in the `parent_profiles` table in the database:

```sql
ALTER TABLE "parent_profiles" ADD COLUMN "notification_preferences" text;
```

The `notification_preferences` field stores a JSON string with the following structure:

```typescript
interface NotificationPreferences {
  enabled: boolean;
  preferences: {
    chat: {
      enabled: boolean;
      mode: 'all' | 'mentions' | 'none';
    };
    reminders: {
      enabled: boolean;
    };
    village: {
      enabled: boolean;
      types: {
        newMembers: boolean;
        memberUpdates: boolean;
        interactions: boolean;
      };
    };
    system: {
      enabled: boolean;
    };
  };
  schedule: {
    quietHoursEnabled: boolean;
    quietHoursStart: string; // Format: "HH:MM" (24-hour)
    quietHoursEnd: string;   // Format: "HH:MM" (24-hour)
  };
}
```

## Server-Side Implementation

### Notification Service

The notification service (`server/services/notification.ts`) provides methods for managing notification preferences:

- `getNotificationPreferences(userId)`: Retrieves a user's notification preferences
- `updateNotificationPreferences(userId, preferences)`: Updates a user's notification preferences
- `isQuietHours(userId)`: Checks if the current time is within a user's quiet hours
- `isNotificationTypeEnabled(userId, type)`: Checks if a specific notification type is enabled for a user

### API Endpoints

The following API endpoints are available for managing notification preferences:

- `GET /notifications/preferences`: Get the current user's notification preferences
- `PUT /notifications/preferences`: Update the current user's notification preferences

## Client-Side Implementation

### NotificationPreferences Component

The `NotificationPreferences` component (`client/src/components/NotificationPreferences.tsx`) provides a user interface for managing notification preferences. It includes:

- A main toggle for enabling/disabling all notifications
- Toggles for specific notification types
- Configuration options for chat notification mode
- Toggles for specific village update types
- Quiet hours configuration

### Integration with Profile Settings

The notification preferences component is integrated into the profile settings page (`client/src/pages/EditProfileView.tsx`) as a separate tab.

## Usage

### Checking Notification Preferences

Before sending a notification, the notification service checks if the notification type is enabled for the user and if the current time is within quiet hours:

```typescript
// Example: Sending a chat notification
async function sendChatNotification(userId, sender, message, chatId) {
  // Check if chat notifications are enabled
  const isEnabled = await notificationService.isNotificationTypeEnabled(userId, 'chat');
  if (!isEnabled) {
    return;
  }
  
  // Check if it's quiet hours
  const isQuiet = await notificationService.isQuietHours(userId);
  if (isQuiet) {
    return;
  }
  
  // Send the notification
  // ...
}
```

### Default Preferences

New users are assigned default notification preferences:

```typescript
const DEFAULT_NOTIFICATION_PREFERENCES = {
  enabled: true,
  preferences: {
    chat: {
      enabled: true,
      mode: 'all'
    },
    reminders: {
      enabled: true
    },
    village: {
      enabled: true,
      types: {
        newMembers: true,
        memberUpdates: true,
        interactions: true
      }
    },
    system: {
      enabled: true
    }
  },
  schedule: {
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00"
  }
};
```

## Future Enhancements

Potential future enhancements to the notification preferences feature:

1. **Per-device preferences**: Allow users to configure different preferences for different devices
2. **Notification digests**: Group notifications and send them as a digest at specified intervals
3. **Custom notification sounds**: Allow users to select different sounds for different notification types
4. **Location-based notifications**: Enable/disable notifications based on the user's location
5. **Advanced scheduling**: Allow users to set different notification preferences for different days of the week 