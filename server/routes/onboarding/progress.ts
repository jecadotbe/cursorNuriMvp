import { Router } from "express";
import { db } from "@db";
import { parentProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import { handleRouteError } from "../utils/error-handler";
import { ensureAuthenticated } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";
import { mem0Service } from "../../services/mem0";

export function setupProgressRoutes(router: Router) {
  // Get onboarding progress
  router.get("/progress", ensureAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      if (!profile) {
        // If no profile exists, create an initial one
        const newProfile = await db
          .insert(parentProfiles)
          .values({
            userId: user.id,
            name: "",
            stressLevel: "moderate",
            experienceLevel: "first_time",
            completedOnboarding: false,
            currentOnboardingStep: 0,
            onboardingData: {
              childProfiles: [],
            },
          })
          .returning();

        return res.json({
          currentOnboardingStep: 0,
          completedOnboarding: false,
          onboardingData: {
            childProfiles: [],
          },
        });
      }

      res.json({
        currentOnboardingStep: profile.currentOnboardingStep || 0,
        completedOnboarding: profile.completedOnboarding || false,
        onboardingData: profile.onboardingData || { childProfiles: [] },
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch onboarding progress");
    }
  });

  // Update onboarding progress
  router.post("/progress", ensureAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const { step, data } = req.body;
      if (typeof step !== "number" || step < 0 || step > 4) {
        return res.status(400).json({ message: "Invalid step number" });
      }

      if (!data) {
        return res.status(400).json({ message: "Onboarding data is required" });
      }

      // Validate child profiles if present
      if (data.childProfiles) {
        if (!Array.isArray(data.childProfiles)) {
          return res.status(400).json({ message: "Child profiles must be an array" });
        }

        // Basic validation for each child profile
        for (const child of data.childProfiles) {
          if (!child.name || typeof child.name !== "string") {
            return res.status(400).json({ message: "Each child must have a valid name" });
          }
          
          if (typeof child.age !== "number" || child.age < 0 || child.age > 18) {
            return res.status(400).json({ 
              message: `Invalid age for child ${child.name}: ${child.age}. Age must be a number between 0 and 18` 
            });
          }
          
          if (!Array.isArray(child.specialNeeds)) {
            return res.status(400).json({ 
              message: `Special needs for child ${child.name} must be an array` 
            });
          }
        }
      }

      // Store onboarding step data in mem0 (non-blocking)
      Promise.resolve().then(async () => {
        try {
          const success = await mem0Service.storeOnboardingStep(user.id, step, data);
          if (success) {
            console.log(`Onboarding step ${step} successfully stored in mem0 for user ${user.id}`);
          } else {
            console.warn(`Failed to store onboarding step ${step} in mem0 for user ${user.id}`);
          }
        } catch (memError) {
          console.error(`Error storing onboarding step ${step} in mem0:`, memError);
        }
      });

      // Get existing profile or create new one
      const existingProfile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      if (existingProfile) {
        // Update existing profile
        const updatedProfile = await db
          .update(parentProfiles)
          .set({
            currentOnboardingStep: step,
            completedOnboarding: step === 4 ? true : false,
            onboardingData: {
              ...(existingProfile.onboardingData || {}),
              ...data,
            },
            updatedAt: new Date(),
          })
          .where(eq(parentProfiles.userId, user.id))
          .returning();

        return res.json({
          message: "Onboarding progress updated",
          profile: updatedProfile[0],
        });
      } else {
        // Create new profile
        const newProfile = await db
          .insert(parentProfiles)
          .values({
            userId: user.id,
            name: data.basicInfo?.name || "",
            stressLevel: data.stressAssessment?.stressLevel || "moderate",
            experienceLevel: data.basicInfo?.experienceLevel || "first_time",
            completedOnboarding: step === 4 ? true : false,
            currentOnboardingStep: step,
            onboardingData: data,
          })
          .returning();

        return res.json({
          message: "Onboarding progress created",
          profile: newProfile[0],
        });
      }
    } catch (error) {
      handleRouteError(res, error, "Failed to update onboarding progress");
    }
  });

  return router;
}