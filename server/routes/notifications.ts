import { Router } from "express";
import { db } from "@db";
import { parentProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import webpush from "web-push";
import type { User } from "../auth";
import { notificationService } from "../services/notification";

// Configure web-push with VAPID keys
// You'll need to generate these keys: 
// npx web-push generate-vapid-keys
webpush.setVapidDetails(
  'mailto:support@nuriapp.com', // Change this to your support email
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export function setupNotificationRoutes(router: Router) {
  // Get VAPID public key
  router.get("/vapid-public-key", (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  });

  // Subscribe to push notifications
  router.post("/subscribe", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const user = req.user as User;
      const subscription = req.body.subscription;

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ message: "Invalid subscription" });
      }

      // Store subscription in user's profile
      // Note: You would need to add a 'pushSubscriptions' field to your schema
      await db.update(parentProfiles)
        .set({ 
          pushSubscriptions: JSON.stringify(subscription)
        })
        .where(eq(parentProfiles.userId, user.id));

      res.status(201).json({ message: "Subscription added" });
    } catch (error) {
      console.error("Push subscription error:", error);
      res.status(500).json({
        message: "Failed to subscribe to notifications",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Endpoint to send a test notification
  router.post("/send-test", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const user = req.user as User;
      
      // Get the user's profile to retrieve subscription
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      if (!profile || !profile.pushSubscriptions) {
        return res.status(404).json({ message: "No push subscription found" });
      }

      const subscription = JSON.parse(profile.pushSubscriptions);
      
      // Send a test notification
      const payload = JSON.stringify({
        title: "Nuri App Notification",
        body: "This is a test notification from Nuri!",
        url: "/chat"
      });

      await webpush.sendNotification(subscription, payload);
      
      res.json({ message: "Test notification sent" });
    } catch (error) {
      console.error("Notification sending error:", error);
      res.status(500).json({
        message: "Failed to send test notification",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get notification preferences
  router.get("/preferences", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const user = req.user as User;
      const preferences = await notificationService.getNotificationPreferences(user.id);
      
      res.json(preferences);
    } catch (error) {
      console.error("Error getting notification preferences:", error);
      res.status(500).json({
        message: "Failed to get notification preferences",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Update notification preferences
  router.put("/preferences", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const user = req.user as User;
      const preferences = req.body;
      
      await notificationService.updateNotificationPreferences(user.id, preferences);
      
      // Return the updated preferences
      const updatedPreferences = await notificationService.getNotificationPreferences(user.id);
      
      res.json(updatedPreferences);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({
        message: "Failed to update notification preferences",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
} 