import { db } from '@db';
import { notificationService } from './notification';
import { parentProfiles } from '@db/schema';
import { eq } from 'drizzle-orm';

interface Reminder {
  id: string;
  userId: number;
  title: string;
  description: string;
  scheduledTime: Date;
  completed: boolean;
  targetUrl?: string;
}

class ReminderService {
  private static instance: ReminderService;
  private reminders: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    // Start checking for reminders every minute
    setInterval(() => this.checkReminders(), 60 * 1000);
  }

  public static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  /**
   * Schedule a reminder for a user
   * @param userId The user ID to send the reminder to
   * @param title The reminder title
   * @param description The reminder description
   * @param scheduledTime When to send the reminder
   * @param targetUrl The URL to open when the notification is clicked
   * @returns The reminder ID
   */
  async scheduleReminder(
    userId: number,
    title: string,
    description: string,
    scheduledTime: Date,
    targetUrl: string = '/'
  ): Promise<string> {
    // Check if user exists and has notification permissions
    const profile = await db.query.parentProfiles.findFirst({
      where: eq(parentProfiles.userId, userId),
    });

    if (!profile) {
      throw new Error(`User ${userId} not found`);
    }

    // Generate a unique ID for the reminder
    const reminderId = `reminder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create the reminder object
    const reminder: Reminder = {
      id: reminderId,
      userId,
      title,
      description,
      scheduledTime,
      completed: false,
      targetUrl
    };

    // Calculate the delay until the reminder should be sent
    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();
    
    if (delay <= 0) {
      // If the scheduled time is in the past, send immediately
      this.sendReminder(reminder);
    } else {
      // Schedule the reminder
      const timeout = setTimeout(() => {
        this.sendReminder(reminder);
      }, delay);
      
      // Store the timeout so it can be cancelled if needed
      this.reminders.set(reminderId, timeout);
      
      console.log(`Scheduled reminder "${title}" for user ${userId} at ${scheduledTime.toISOString()}`);
    }
    
    return reminderId;
  }

  /**
   * Cancel a scheduled reminder
   * @param reminderId The ID of the reminder to cancel
   * @returns Whether the reminder was successfully cancelled
   */
  cancelReminder(reminderId: string): boolean {
    const timeout = this.reminders.get(reminderId);
    
    if (timeout) {
      clearTimeout(timeout);
      this.reminders.delete(reminderId);
      console.log(`Cancelled reminder ${reminderId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Send a reminder notification
   * @param reminder The reminder to send
   */
  private async sendReminder(reminder: Reminder): Promise<void> {
    try {
      // Send the notification
      await notificationService.sendReminderNotification(
        reminder.userId,
        reminder.title,
        reminder.description,
        reminder.targetUrl
      );
      
      // Mark the reminder as completed
      reminder.completed = true;
      
      // Remove the reminder from the map
      this.reminders.delete(reminder.id);
      
      console.log(`Sent reminder "${reminder.title}" to user ${reminder.userId}`);
    } catch (error) {
      console.error(`Failed to send reminder ${reminder.id}:`, error);
    }
  }

  /**
   * Check for reminders that need to be sent
   * This is a backup mechanism in case the server restarts
   */
  private async checkReminders(): Promise<void> {
    // In a real implementation, this would load reminders from a database
    // and check if any need to be sent
    console.log('Checking for reminders...');
  }

  /**
   * Create a reminder from a chat message
   * This method analyzes a message and creates reminders based on its content
   * @param userId The user ID
   * @param message The message to analyze
   */
  async createReminderFromMessage(userId: number, message: string): Promise<string | null> {
    // This is a simplified implementation
    // In a real app, you would use NLP to extract dates, times, and actions
    
    // Check if the message contains reminder keywords
    const reminderKeywords = ['remind', 'remember', 'don\'t forget', 'schedule'];
    const hasReminderKeyword = reminderKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    if (!hasReminderKeyword) {
      return null;
    }
    
    // For this example, we'll create a reminder for tomorrow at 9 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    // Extract a title from the message (simplified)
    const title = message.length > 50 
      ? `${message.substring(0, 47)}...` 
      : message;
    
    // Schedule the reminder
    return this.scheduleReminder(
      userId,
      'Reminder from Nuri',
      title,
      tomorrow,
      '/chat'
    );
  }
}

export const reminderService = ReminderService.getInstance(); 