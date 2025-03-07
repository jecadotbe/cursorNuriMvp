/**
 * Types for notification-related functionality
 */

/**
 * Represents the structure of notification preferences for a user
 */
export interface NotificationPreferences {
  /**
   * Whether the user has enabled notifications overall
   */
  enabled: boolean;
  
  /**
   * Preferences for different types of notifications
   */
  preferences: {
    /**
     * Chat message notifications
     */
    chat: {
      enabled: boolean;
      /**
       * Whether to send notifications for all messages or only mentions
       */
      mode: 'all' | 'mentions' | 'none';
    };
    
    /**
     * Reminder notifications
     */
    reminders: {
      enabled: boolean;
    };
    
    /**
     * Village update notifications
     */
    village: {
      enabled: boolean;
      /**
       * Types of village updates to notify about
       */
      types: {
        newMembers: boolean;
        memberUpdates: boolean;
        interactions: boolean;
      };
    };
    
    /**
     * System notifications (app updates, maintenance, etc.)
     */
    system: {
      enabled: boolean;
    };
  };
  
  /**
   * Time-based notification settings
   */
  schedule: {
    /**
     * Whether to respect quiet hours
     */
    quietHoursEnabled: boolean;
    /**
     * Start time for quiet hours (24-hour format, e.g., "22:00")
     */
    quietHoursStart: string;
    /**
     * End time for quiet hours (24-hour format, e.g., "07:00")
     */
    quietHoursEnd: string;
  };
}

/**
 * Default notification preferences for new users
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
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

/**
 * Structure of a web push subscription
 */
export interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Payload structure for push notifications
 */
export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: {
    url?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
} 