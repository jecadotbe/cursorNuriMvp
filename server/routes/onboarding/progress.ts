import { Router } from "express";
import { db } from "@db";
import { parentProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import { handleRouteError } from "../utils/error-handler";
import { ensureAuthenticated } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";
import { memoryService } from "../../services/memory";

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

      // Store onboarding step data in mem0 after each step
      try {
        // Create a formatted string based on the current step data
        let memoryContent = '';
        switch (step) {
          case 0:
            if (data.basicInfo) {
              memoryContent = `
Basic Information (Onboarding Step 1):
Name: ${data.basicInfo.name || 'Not provided'}
Parent Type: ${data.basicInfo.parentType || 'Not specified'}
Experience Level: ${data.basicInfo.experienceLevel || 'Not specified'}
`;
            }
            break;
          case 1:
            if (data.stressAssessment) {
              memoryContent = `
Stress Assessment (Onboarding Step 2):
Stress Level: ${data.stressAssessment.stressLevel || 'Not specified'}
Primary Concerns: ${data.stressAssessment.primaryConcerns?.join(', ') || 'None specified'}
Support Network: ${data.stressAssessment.supportNetwork?.join(', ') || 'None specified'}
`;
            }
            break;
          case 2:
            if (data.childProfiles && Array.isArray(data.childProfiles)) {
              memoryContent = `
Child Profiles (Onboarding Step 3):
${data.childProfiles.map((child: any) => 
  `- ${child.name} (Age: ${child.age})${
    child.specialNeeds?.length ? `, Special needs: ${child.specialNeeds.join(', ')}` : ''
  }`
).join('\n')}
`;
            }
            break;
          case 3:
            if (data.goals) {
              memoryContent = `
Parenting Goals (Onboarding Step 4):
Short-term goals: ${data.goals.shortTerm?.join(', ') || 'None specified'}
Long-term goals: ${data.goals.longTerm?.join(', ') || 'None specified'}
Support areas: ${data.goals.supportAreas?.join(', ') || 'None specified'}
Communication preference: ${data.goals.communicationPreference || 'Not specified'}
`;
            }
            break;
        }

        if (memoryContent) {
          // Store this step in mem0 without blocking the response
          memoryService.createMemory(user.id, memoryContent, {
            type: "onboarding_step_" + step,
            category: "user_onboarding",
            source: "onboarding",
            step: step,
          }).catch(memoryError => {
            console.error(`Memory storage error for onboarding step ${step}:`, memoryError);
            // Non-blocking - continue even if memory storage fails
          });
        }
      } catch (memoryError) {
        console.error("Error preparing onboarding step memory:", memoryError);
        // Non-blocking - continue even if memory preparation fails
      }

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
              ...existingProfile.onboardingData,
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