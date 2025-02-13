import { Router } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export function setupOnboardingRoutes(router: Router) {
  // Get onboarding progress
  router.get("/onboarding/progress", async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json({
        name: user.name,
        onboardingData: user.onboardingData
      });
    } catch (error) {
      console.error("Error fetching onboarding progress:", error);
      return res.status(500).json({ message: "Failed to fetch onboarding progress" });
    }
  });

  // Update onboarding progress
  router.post("/onboarding/progress", async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { step, data } = req.body;

      if (!data) {
        return res.status(400).json({ message: "No data provided" });
      }

      const updatedUser = await db
        .update(users)
        .set({
          onboardingData: data,
          onboardingStep: step,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.user.id))
        .returning();

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json({
        message: "Profile updated successfully",
        user: updatedUser[0]
      });
    } catch (error) {
      console.error("Error updating onboarding progress:", error);
      return res.status(500).json({ message: "Failed to update profile" });
    }
  });

  return router;
}