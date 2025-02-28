import { Router, Response } from "express";
import { db } from "@db";
import { parentProfiles, childProfiles, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { handleRouteError } from "../utils/error-handler";
import { ensureAuthenticated } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";

export function setupOnboardingRoutes(router: Router) {
  // Get user's onboarding profile data
  router.get("/onboarding", ensureAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      // Get parent profile
      const parentProfile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      // Get child profiles
      const children = await db.query.childProfiles.findMany({
        where: eq(childProfiles.parentId, user.id),
      });

      // Determine onboarding completion status
      const completedOnboarding = Boolean(parentProfile && parentProfile.completedOnboarding);
      const currentStep = parentProfile?.onboardingStep || 1;

      res.json({
        completedOnboarding,
        currentOnboardingStep: currentStep,
        onboardingData: {
          basicInfo: parentProfile ? {
            name: parentProfile.name,
            parentType: parentProfile.parentType,
            experienceLevel: parentProfile.experienceLevel,
          } : undefined,
          childProfiles: children.map(child => ({
            name: child.name,
            age: child.age,
            specialNeeds: child.specialNeeds || [],
          })),
          stressAssessment: parentProfile ? {
            stressLevel: parentProfile.stressLevel,
            primaryConcerns: parentProfile.primaryConcerns || [],
            supportNetwork: parentProfile.supportNetwork || [],
          } : undefined,
          goals: parentProfile ? {
            shortTerm: parentProfile.shortTermGoals || [],
            longTerm: parentProfile.longTermGoals || [],
            supportAreas: parentProfile.supportAreas || [],
            communicationPreference: parentProfile.communicationPreference,
          } : undefined,
        },
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch onboarding data");
    }
  });

  // Update onboarding data
  router.post("/onboarding/:step", ensureAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const step = parseInt(req.params.step);
      if (isNaN(step) || step < 1 || step > 4) {
        return res.status(400).json({ message: "Invalid step" });
      }

      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ message: "No data provided" });
      }

      // Check if parent profile exists
      let parentProfile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      // Create or update parent profile based on step
      if (step === 1 && data.basicInfo) {
        const { name, parentType, experienceLevel } = data.basicInfo;

        if (parentProfile) {
          await db
            .update(parentProfiles)
            .set({
              name,
              parentType,
              experienceLevel,
              onboardingStep: 2,
              updatedAt: new Date(),
            })
            .where(eq(parentProfiles.userId, user.id));
        } else {
          await db.insert(parentProfiles).values({
            userId: user.id,
            name,
            parentType,
            experienceLevel,
            onboardingStep: 2,
            completedOnboarding: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Also update the username in the users table if not set
        if (user.username === user.email) {
          await db
            .update(users)
            .set({ username: name })
            .where(eq(users.id, user.id));
        }
      } else if (step === 2 && data.stressAssessment) {
        const { stressLevel, primaryConcerns, supportNetwork } = data.stressAssessment;

        if (parentProfile) {
          await db
            .update(parentProfiles)
            .set({
              stressLevel,
              primaryConcerns,
              supportNetwork,
              onboardingStep: 3,
              updatedAt: new Date(),
            })
            .where(eq(parentProfiles.userId, user.id));
        } else {
          return res.status(400).json({ message: "Basic info must be completed first" });
        }
      } else if (step === 3 && data.childProfiles) {
        const { childProfiles: childProfilesData } = data;

        // Clear existing child profiles
        // Note: In a real app, you might want to update existing profiles instead of deleting
        await db.delete(childProfiles).where(eq(childProfiles.parentId, user.id));

        // Create new child profiles
        for (const child of childProfilesData) {
          await db.insert(childProfiles).values({
            parentId: user.id,
            name: child.name,
            age: child.age,
            specialNeeds: child.specialNeeds || [],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        if (parentProfile) {
          await db
            .update(parentProfiles)
            .set({
              onboardingStep: 4,
              updatedAt: new Date(),
            })
            .where(eq(parentProfiles.userId, user.id));
        }
      } else if (step === 4 && data.goals) {
        const { shortTerm, longTerm, supportAreas, communicationPreference } = data.goals;

        if (parentProfile) {
          await db
            .update(parentProfiles)
            .set({
              shortTermGoals: shortTerm,
              longTermGoals: longTerm,
              supportAreas: supportAreas,
              communicationPreference: communicationPreference || "empathetic",
              onboardingStep: 5,
              completedOnboarding: true,
              updatedAt: new Date(),
            })
            .where(eq(parentProfiles.userId, user.id));
        } else {
          return res.status(400).json({ message: "Previous steps must be completed first" });
        }
      }

      // Get updated parent profile
      parentProfile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
      });

      const children = await db.query.childProfiles.findMany({
        where: eq(childProfiles.parentId, user.id),
      });

      res.json({
        currentOnboardingStep: parentProfile?.onboardingStep || 1,
        completedOnboarding: Boolean(parentProfile?.completedOnboarding),
        message: "Onboarding data updated successfully",
        onboardingData: {
          basicInfo: parentProfile ? {
            name: parentProfile.name,
            parentType: parentProfile.parentType,
            experienceLevel: parentProfile.experienceLevel,
          } : undefined,
          childProfiles: children.map(child => ({
            name: child.name,
            age: child.age,
            specialNeeds: child.specialNeeds || [],
          })),
          stressAssessment: parentProfile ? {
            stressLevel: parentProfile.stressLevel,
            primaryConcerns: parentProfile.primaryConcerns || [],
            supportNetwork: parentProfile.supportNetwork || [],
          } : undefined,
          goals: parentProfile ? {
            shortTerm: parentProfile.shortTermGoals || [],
            longTerm: parentProfile.longTermGoals || [],
            supportAreas: parentProfile.supportAreas || [],
            communicationPreference: parentProfile.communicationPreference,
          } : undefined,
        },
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to update onboarding data");
    }
  });

  return router;
}