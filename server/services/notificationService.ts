import webpush from 'web-push';
import { db } from '../../db/index.js';
import { parentProfiles } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES, PushNotificationPayload } from '../types/notifications.js';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:contact@nuri.app',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

/**
 * Singleton service for handling push notifications
 */
class NotificationService {
  /**
   * Get notification preferences for a user
   * @param userId The user ID
   * @returns The user's notification preferences
   */
  async getNotificationPreferences(userId: number): Promise<NotificationPreferences> {
    const profile = await db.query.parentProfiles.findFirst({
      where: eq(parentProfiles.userId, userId)
    });

    if (!profile || !profile.notificationPreferences) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    try {
      return JSON.parse(profile.notificationPreferences);
    } catch (error) {
      console.error('Error parsing notification preferences:', error);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  }

  /**
   * Update notification preferences for a user
   * @param userId The user ID
   * @param preferences The new notification preferences
   */
  async updateNotificationPreferences(userId: number, preferences: Partial<NotificationPreferences>): Promise<void> {
    const currentPreferences = await this.getNotificationPreferences(userId);
    
    // Merge the new preferences with the current ones
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
      preferences: {
        ...currentPreferences.preferences,
        ...(preferences.preferences || {})
      }
    };

    await db.update(parentProfiles)
      .set({ notificationPreferences: JSON.stringify(updatedPreferences) })
      .where(eq(parentProfiles.userId, userId));
  }

  /**
   * Check if a user has enabled a specific type of notification
   * @param userId The user ID
   * @param type The notification type to check
   * @returns Whether the notification type is enabled
   */
  async isNotificationEnabled(userId: number, type: keyof NotificationPreferences['preferences']): Promise<boolean> {
    const preferences = await this.getNotificationPreferences(userId);
    
    // First check if notifications are enabled overall
    if (!preferences.enabled) {
      return false;
    }
    
    // Then check if the specific type is enabled
    return preferences.preferences[type]?.enabled || false;
  }

  /**
   * Check if the current time is within quiet hours for a user
   * @param userId The user ID
   * @returns Whether the current time is within quiet hours
   */
  async isQuietHours(userId: number): Promise<boolean> {
    const preferences = await this.getNotificationPreferences(userId);
    
    if (!preferences.schedule.quietHoursEnabled) {
      return false;
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const [startHour, startMinute] = preferences.schedule.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = preferences.schedule.quietHoursEnd.split(':').map(Number);
    
    const currentTime = currentHour * 60 + currentMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    // Handle the case where quiet hours span across midnight
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Send a chat notification to a user
   * @param userId The user ID
   * @param sender The sender name
   * @param message The message content
   * @param chatId The chat ID
   */
  async sendChatNotification(userId: number, sender: string, message: string, chatId: string): Promise<void> {
    // Check if chat notifications are enabled
    const isEnabled = await this.isNotificationEnabled(userId, 'chat');
    if (!isEnabled) {
      return;
    }
    
    // Check if it's quiet hours
    const isQuiet = await this.isQuietHours(userId);
    if (isQuiet) {
      return;
    }
    
    const profile = await db.query.parentProfiles.findFirst({
      where: eq(parentProfiles.userId, userId)
    });
    
    if (!profile || !profile.pushSubscriptions) {
      return;
    }
    
    try {
      const subscription = JSON.parse(profile.pushSubscriptions);
      
      const payload: PushNotificationPayload = {
        title: `Message from ${sender}`,
        body: message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-96x96.png',
        tag: `chat-${chatId}`,
        data: {
          url: `/chat/${chatId}`
        }
      };
      
      await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (error) {
      console.error('Error sending chat notification:', error);
    }
  }

  /**
   * Send a reminder notification to a user
   * @param userId The user ID
   * @param title The reminder title
   * @param body The reminder body
   * @param url The URL to navigate to when the notification is clicked
   */
  async sendReminderNotification(userId: number, title: string, body: string, url: string): Promise<void> {
    // Check if reminder notifications are enabled
    const isEnabled = await this.isNotificationEnabled(userId, 'reminders');
    if (!isEnabled) {
      return;
    }
    
    // Check if it's quiet hours
    const isQuiet = await this.isQuietHours(userId);
    if (isQuiet) {
      return;
    }
    
    const profile = await db.query.parentProfiles.findFirst({
      where: eq(parentProfiles.userId, userId)
    });
    
    if (!profile || !profile.pushSubscriptions) {
      return;
    }
    
    try {
      const subscription = JSON.parse(profile.pushSubscriptions);
      
      const payload: PushNotificationPayload = {
        title,
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-96x96.png',
        tag: `reminder-${Date.now()}`,
        data: { url }
      };
      
      await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (error) {
      console.error('Error sending reminder notification:', error);
    }
  }

  /**
   * Send a village update notification to a user
   * @param userId The user ID
   * @param title The notification title
   * @param body The notification body
   * @param type The type of village update
   * @param url The URL to navigate to when the notification is clicked
   */
  async sendVillageNotification(
    userId: number, 
    title: string, 
    body: string, 
    type: keyof NotificationPreferences['preferences']['village']['types'],
    url: string
  ): Promise<void> {
    // Check if village notifications are enabled
    const preferences = await this.getNotificationPreferences(userId);
    
    if (!preferences.enabled || !preferences.preferences.village.enabled) {
      return;
    }
    
    // Check if the specific type is enabled
    if (!preferences.preferences.village.types[type]) {
      return;
    }
    
    // Check if it's quiet hours
    const isQuiet = await this.isQuietHours(userId);
    if (isQuiet) {
      return;
    }
    
    const profile = await db.query.parentProfiles.findFirst({
      where: eq(parentProfiles.userId, userId)
    });
    
    if (!profile || !profile.pushSubscriptions) {
      return;
    }
    
    try {
      const subscription = JSON.parse(profile.pushSubscriptions);
      
      const payload: PushNotificationPayload = {
        title,
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-96x96.png',
        tag: `village-${type}-${Date.now()}`,
        data: { url }
      };
      
      await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (error) {
      console.error('Error sending village notification:', error);
    }
  }
}

// Export as singleton
export const notificationService = new NotificationService(); 