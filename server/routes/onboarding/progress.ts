import { Router } from "express";
import { db } from "@db";
import { parentProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import { memoryService } from "../../services/memory";
import { handleRouteError } from "../utils/error-handler";
import { ensureAuthenticated } from "../middleware/auth";
import { AuthenticatedRequest, ChildProfile } from "../types";

export function setupProgressRoutes(router: Router) {
  // Get onboarding progress
  router.get("/progress", ensureAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });
      
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
        columns: {
          currentOnboardingStep: true,
          completedOnboarding: true,
          onboardingData: true,
        },
      });
      
      res.json({
        currentOnboardingStep: profile?.currentOnboardingStep || 1,
        completedOnboarding: profile?.completedOnboarding || false,
        onboardingData: profile?.onboardingData || {},
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
      
      // Build a textual representation for memory storage.
      const childProfilesString = Array.isArray(data.childProfiles)
        ? data.childProfiles
            .map(
              (child: any) =>
                `- ${child.name} (Age: ${child.age}) ${
                  child.specialNeeds?.length
                    ? `Special needs: ${child.specialNeeds.join(", ")}`
                    : "No special needs"
                }`,
            )
            .join("\n")
        : "No children profiles added";
        
      const stepContent = `
Onboarding Step ${step} Progress:
${
  data.basicInfo
    ? `
Basic Information:
Name: ${data.basicInfo.name}
Email: ${data.basicInfo.email}
Experience Level: ${data.basicInfo.experienceLevel}`
    : ""
}
${
  data.stressAssessment
    ? `
Stress Assessment:
Stress Level: ${data.stressAssessment.stressLevel}
Primary Concerns: ${data.stressAssessment.primaryConcerns?.join(", ") || "None"}
Support Network: ${data.stressAssessment.supportNetwork?.join(", ") || "None"}`
    : ""
}
${
  data.childProfiles
    ? `
Child Profiles:
${childProfilesString}`
    : ""
}
${
  data.goals
    ? `
Goals:
Short Term: ${data.goals.shortTerm?.join(", ") || "None"}
Long Term: ${data.goals.longTerm?.join(", ") || "None"}
Support Areas: ${data.goals.supportAreas?.join(", ") || "None"}
Communication Preference: ${data.goals.communicationPreference || "Not specified"}`
    : ""
}
      `;
      
      // Save memory (noncritical—log error and continue if fails)
      try {
        await memoryService.createMemory(user.id, stepContent, {
          type: "onboarding_progress",
          category: "user_onboarding",
          step,
          isComplete: false,
          source: "onboarding_form",
          timestamp: new Date().toISOString(),
          metadata: { stepData: data, progressPercentage: (step / 4) * 100 },
        });
      } catch (memoryError) {
        console.error("Memory storage failed:", memoryError);
      }
      
      // Upsert the profile if required data exists.
      if (step >= 2 && data.basicInfo?.name && data.basicInfo?.email) {
        const [profile] = await db
          .insert(parentProfiles)
          .values({
            userId: user.id,
            name: data.basicInfo.name,
            email: data.basicInfo.email,
            stressLevel: data.stressAssessment?.stressLevel || "moderate",
            experienceLevel: data.basicInfo.experienceLevel || "first_time",
            currentOnboardingStep: step,
            onboardingData: {
              ...data,
              childProfiles: Array.isArray(data.childProfiles)
                ? data.childProfiles
                : [],
            },
            completedOnboarding: false,
            primaryConcerns: data.stressAssessment?.primaryConcerns || [],
            supportNetwork: data.stressAssessment?.supportNetwork || [],
          })
          .onConflictDoUpdate({
            target: parentProfiles.userId,
            set: {
              name: data.basicInfo.name,
              email: data.basicInfo.email,
              stressLevel: data.stressAssessment?.stressLevel,
              experienceLevel: data.basicInfo.experienceLevel,
              currentOnboardingStep: step,
              onboardingData: {
                ...data,
                childProfiles: Array.isArray(data.childProfiles)
                  ? data.childProfiles
                  : [],
              },
              primaryConcerns: data.stressAssessment?.primaryConcerns,
              supportNetwork: data.stressAssessment?.supportNetwork,
              updatedAt: new Date(),
            },
          })
          .returning();
          
        return res.json({
          currentOnboardingStep: profile.currentOnboardingStep,
          completedOnboarding: profile.completedOnboarding,
          onboardingData: profile.onboardingData,
        });
      }
      
      res.json({
        currentOnboardingStep: step,
        completedOnboarding: false,
        onboardingData: {
          ...data,
          childProfiles: Array.isArray(data.childProfiles)
            ? data.childProfiles
            : [],
        },
      });
    } catch (error) {
      handleRouteError(res, error, "Failed to save onboarding progress");
    }
  });

  return router;
}