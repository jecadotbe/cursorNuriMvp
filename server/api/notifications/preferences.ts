import { Router } from 'express';
import { notificationService } from '../../services/notificationService.js';
import { z } from 'zod';
import { authenticateUser } from '../../middleware/auth.js';

const router = Router();

// Schema for validating notification preferences update
const updatePreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  preferences: z.object({
    chat: z.object({
      enabled: z.boolean().optional(),
      mode: z.enum(['all', 'mentions', 'none']).optional()
    }).optional(),
    reminders: z.object({
      enabled: z.boolean().optional()
    }).optional(),
    village: z.object({
      enabled: z.boolean().optional(),
      types: z.object({
        newMembers: z.boolean().optional(),
        memberUpdates: z.boolean().optional(),
        interactions: z.boolean().optional()
      }).optional()
    }).optional(),
    system: z.object({
      enabled: z.boolean().optional()
    }).optional()
  }).optional(),
  schedule: z.object({
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional()
  }).optional()
});

/**
 * GET /api/notifications/preferences
 * Get the current notification preferences for the authenticated user
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const preferences = await notificationService.getNotificationPreferences(userId);
    
    return res.status(200).json(preferences);
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences for the authenticated user
 */
router.put('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Validate the request body
    const validationResult = updatePreferencesSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid notification preferences', 
        details: validationResult.error.format() 
      });
    }
    
    // Update the preferences
    await notificationService.updateNotificationPreferences(userId, validationResult.data);
    
    // Return the updated preferences
    const updatedPreferences = await notificationService.getNotificationPreferences(userId);
    
    return res.status(200).json(updatedPreferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 