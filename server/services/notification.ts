import webpush from 'web-push';
import { db } from '@db';
import { parentProfiles } from '@db/schema';
import { eq } from 'drizzle-orm';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:support@nuriapp.com', // Change this to your support email
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

interface NotificationPreference {
  type: string;
  enabled: boolean;
}

class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Get notification preferences for a user
   * @param userId The user ID
   * @returns The user's notification preferences
   */
  async getNotificationPreferences(userId: number): Promise<any> {
    const profile = await db.query.parentProfiles.findFirst({
      where: eq(parentProfiles.userId, userId)
    });

    if (!profile || !profile.notificationPreferences) {
      return {
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
    }

    try {
      return JSON.parse(profile.notificationPreferences);
    } catch (error) {
      console.error('Error parsing notification preferences:', error);
      return {
        enabled: true,
        preferences: {
          chat: { enabled: true, mode: 'all' },
          reminders: { enabled: true },
          village: { 
            enabled: true,
            types: { newMembers: true, memberUpdates: true, interactions: true }
          },
          system: { enabled: true }
        },
        schedule: {
          quietHoursEnabled: false,
          quietHoursStart: "22:00",
          quietHoursEnd: "07:00"
        }
      };
    }
  }

  /**
   * Update notification preferences for a user
   * @param userId The user ID
   * @param preferences The new notification preferences
   */
  async updateNotificationPreferences(userId: number, preferences: any): Promise<void> {
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
   * Check if a notification type is enabled for a user
   * @param userId The user ID
   * @param notificationType The notification type to check
   * @returns Whether the notification type is enabled
   */
  private async isNotificationTypeEnabled(
    userId: number,
    notificationType: string
  ): Promise<boolean> {
    try {
      // Get the user's profile to retrieve preferences
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, userId),
      });

      if (!profile || !profile.notificationPreferences) {
        // If no preferences are set, default to enabled
        return true;
      }

      // Parse the preferences
      const preferences: NotificationPreference[] = JSON.parse(profile.notificationPreferences);
      
      // Find the preference for this notification type
      const preference = preferences.find(p => p.type === notificationType);
      
      // If no preference is found, default to enabled
      return preference ? preference.enabled : true;
    } catch (error) {
      console.error('Failed to check notification preferences:', error);
      // Default to enabled if there's an error
      return true;
    }
  }

  /**
   * Send a notification to a user
   * @param userId The user ID to send the notification to
   * @param title The notification title
   * @param body The notification body
   * @param url The URL to open when the notification is clicked
   * @param data Additional data to include with the notification
   * @returns Promise that resolves when the notification is sent
   */
  async sendNotification(
    userId: number,
    title: string,
    body: string,
    url: string = '/',
    data: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      // Check if this notification type is enabled
      const notificationType = data.type || 'general';
      const isEnabled = await this.isNotificationTypeEnabled(userId, notificationType);
      
      if (!isEnabled) {
        console.log(`Notification type ${notificationType} is disabled for user ${userId}`);
        return false;
      }

      // Get the user's profile to retrieve subscription
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, userId),
      });

      if (!profile || !profile.pushSubscriptions) {
        console.log(`No push subscription found for user ${userId}`);
        return false;
      }

      // Parse the subscription
      const subscription = JSON.parse(profile.pushSubscriptions);
      
      // Create the notification payload
      const payload = JSON.stringify({
        title,
        body,
        url,
        ...data,
        timestamp: new Date().toISOString()
      });

      // Send the notification
      await webpush.sendNotification(subscription, payload);
      console.log(`Notification sent to user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Send a chat message notification
   * @param userId The user ID to send the notification to
   * @param senderName The name of the message sender
   * @param messagePreview A preview of the message content
   * @param chatId The chat ID
   * @returns Promise that resolves when the notification is sent
   */
  async sendChatNotification(
    userId: number,
    senderName: string,
    messagePreview: string,
    chatId: string | number
  ): Promise<boolean> {
    const title = `New message from ${senderName}`;
    const body = messagePreview.length > 100 
      ? `${messagePreview.substring(0, 97)}...` 
      : messagePreview;
    const url = `/chat/${chatId}`;
    
    return this.sendNotification(userId, title, body, url, {
      type: 'chat',
      chatId
    });
  }

  /**
   * Send a reminder notification
   * @param userId The user ID to send the notification to
   * @param title The reminder title
   * @param description The reminder description
   * @param targetUrl The URL to open when the notification is clicked
   * @returns Promise that resolves when the notification is sent
   */
  async sendReminderNotification(
    userId: number,
    title: string,
    description: string,
    targetUrl: string = '/'
  ): Promise<boolean> {
    return this.sendNotification(
      userId,
      `Reminder: ${title}`,
      description,
      targetUrl,
      { type: 'reminder' }
    );
  }

  /**
   * Send a village update notification
   * @param userId The user ID to send the notification to
   * @param updateType The type of update (new member, interaction, etc.)
   * @param memberName The name of the village member
   * @returns Promise that resolves when the notification is sent
   */
  async sendVillageUpdateNotification(
    userId: number,
    updateType: 'new_member' | 'interaction' | 'suggestion',
    memberName: string
  ): Promise<boolean> {
    let title = 'Village Update';
    let body = '';
    
    switch (updateType) {
      case 'new_member':
        title = 'New Village Member';
        body = `${memberName} has been added to your village`;
        break;
      case 'interaction':
        title = 'New Interaction';
        body = `New interaction recorded with ${memberName}`;
        break;
      case 'suggestion':
        title = 'Village Suggestion';
        body = `We have a suggestion related to ${memberName}`;
        break;
    }
    
    return this.sendNotification(
      userId,
      title,
      body,
      '/village',
      { type: 'village', memberName }
    );
  }
}

export const notificationService = NotificationService.getInstance(); 