import { Router } from 'express';
import { db } from '@db';
import { parentProfiles } from '@db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '../../auth';

const router = Router();

// Route to provide the VAPID public key to clients
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Get notification preferences
router.get('/preferences', async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).send("Not authenticated");
  }

  try {
    const user = req.user as User;
    
    // Get the user's profile to retrieve preferences
    const profile = await db.query.parentProfiles.findFirst({
      where: eq(parentProfiles.userId, user.id),
    });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Get notification preferences from profile
    // If not set, return default preferences
    const notificationPreferences = profile.notificationPreferences 
      ? JSON.parse(profile.notificationPreferences)
      : [
          { type: 'chat', enabled: true },
          { type: 'reminder', enabled: true },
          { type: 'village', enabled: true }
        ];
    
    res.json(notificationPreferences);
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    res.status(500).json({
      message: "Failed to fetch notification preferences",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Update notification preferences
router.post('/preferences', async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).send("Not authenticated");
  }

  try {
    const user = req.user as User;
    const { preferences } = req.body;

    if (!preferences || !Array.isArray(preferences)) {
      return res.status(400).json({ message: "Invalid preferences format" });
    }

    // Update the user's profile with the new preferences
    await db.update(parentProfiles)
      .set({ 
        notificationPreferences: JSON.stringify(preferences)
      })
      .where(eq(parentProfiles.userId, user.id));

    res.json({ message: "Preferences updated successfully" });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    res.status(500).json({
      message: "Failed to update notification preferences",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router; 