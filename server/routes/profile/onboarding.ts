import { Router } from "express";
import { db } from "@db";
import { parentProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import type { User } from "../../auth";
import { memoryService } from "../../services/memory";

export function setupOnboardingRoutes(router: Router) {
  // Get onboarding progress
  router.get("/progress", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;

    try {
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
        columns: {
          currentOnboardingStep: true,
          completedOnboarding: true,
          onboardingData: true,
        }
      });

      res.json({
        currentOnboardingStep: profile?.currentOnboardingStep || 1,
        completedOnboarding: profile?.completedOnboarding || false,
        onboardingData: profile?.onboardingData || {},
      });
    } catch (error) {
      console.error("Failed to fetch onboarding progress:", error);
      res.status(500).json({
        message: "Failed to fetch onboarding progress",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Update onboarding progress
  router.post("/progress", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;
    const { step, data } = req.body;

    try {
      // Store intermediate progress in memory service
      try {
        const childProfilesString = Array.isArray(data.childProfiles)
          ? data.childProfiles
              .map(
                (child: any) =>
                  `- ${child.name} (Age: ${child.age})
                   ${child.specialNeeds?.length ? `Special needs: ${child.specialNeeds.join(", ")}` : "No special needs"}`
              )
              .join("\n")
          : "No children profiles added";

        const stepContent = `
Onboarding Step ${step} Progress:
${data.basicInfo ? `
Basic Information:
Name: ${data.basicInfo.name}
Email: ${data.basicInfo.email}
Experience Level: ${data.basicInfo.experienceLevel}
` : ''}
${data.stressAssessment ? `
Stress Assessment:
Stress Level: ${data.stressAssessment.stressLevel}
Primary Concerns: ${data.stressAssessment.primaryConcerns?.join(", ") || "None"}
Support Network: ${data.stressAssessment.supportNetwork?.join(", ") || "None"}
` : ''}
${data.childProfiles ? `
Child Profiles:
${childProfilesString}
` : ''}
${data.goals ? `
Goals:
Short Term: ${data.goals.shortTerm?.join(", ") || "None"}
Long Term: ${data.goals.longTerm?.join(", ") || "None"}
Support Areas: ${data.goals.supportAreas?.join(", ") || "None"}
Communication Preference: ${data.goals.communicationPreference || "Not specified"}
` : ''}`;

        await memoryService.createMemory(user.id, stepContent, {
          type: "onboarding_progress",
          category: "user_onboarding",
          step: step,
          isComplete: false,
          source: "onboarding_form",
          timestamp: new Date().toISOString(),
          metadata: {
            stepData: data,
            progressPercentage: (step / 4) * 100,
          }
        });

        console.log("Successfully stored onboarding progress in memory");
      } catch (memoryError) {
        console.error("Failed to store onboarding progress in memory:", memoryError);
        // Continue with database storage even if memory storage fails
      }

      // Extract fields from onboarding data
      const name = data.basicInfo?.name || "";
      const email = data.basicInfo?.email || "";
      const stressLevel = data.stressAssessment?.stressLevel || "moderate";
      const experienceLevel = data.basicInfo?.experienceLevel || "first_time";

      // Only save to parent_profiles if we have the required data
      if (step >= 2 && data.basicInfo?.name && data.basicInfo?.email) {
        const [profile] = await db
          .insert(parentProfiles)
          .values({
            userId: user.id,
            name,
            email,
            stressLevel: stressLevel as any,
            experienceLevel: experienceLevel as any,
            currentOnboardingStep: step,
            onboardingData: {
              ...data,
              childProfiles: Array.isArray(data.childProfiles) ? data.childProfiles : []
            },
            completedOnboarding: false,
            primaryConcerns: data.stressAssessment?.primaryConcerns || [],
            supportNetwork: data.stressAssessment?.supportNetwork || [],
          })
          .onConflictDoUpdate({
            target: parentProfiles.userId,
            set: {
              name,
              email,
              stressLevel: (data.stressAssessment?.stressLevel as any) || undefined,
              experienceLevel: (data.basicInfo?.experienceLevel as any) || undefined,
              currentOnboardingStep: step,
              onboardingData: {
                ...data,
                childProfiles: Array.isArray(data.childProfiles) ? data.childProfiles : []
              },
              primaryConcerns: data.stressAssessment?.primaryConcerns || undefined,
              supportNetwork: data.stressAssessment?.supportNetwork || undefined,
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

      // For early steps, just return the current progress without saving to database
      res.json({
        currentOnboardingStep: step,
        completedOnboarding: false,
        onboardingData: {
          ...data,
          childProfiles: Array.isArray(data.childProfiles) ? data.childProfiles : []
        },
      });
    } catch (error) {
      console.error("Failed to save onboarding progress:", error);
      res.status(500).json({
        message: "Failed to save onboarding progress",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Complete onboarding
  router.post("/complete", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;
    const finalData = req.body;

    try {
      // Extract fields from onboarding data
      const name = finalData.basicInfo?.name;
      const email = finalData.basicInfo?.email;
      const stressLevel = finalData.stressAssessment?.stressLevel;
      const experienceLevel = finalData.basicInfo?.experienceLevel;
      const supportNetwork = finalData.stressAssessment?.supportNetwork || [];

      // Validate required fields
      if (!name || !stressLevel || !experienceLevel) {
        return res.status(400).json({
          message: "Missing required fields",
          details: {
            name: !name,
            stressLevel: !stressLevel,
            experienceLevel: !experienceLevel,
          },
        });
      }

      // Store final onboarding data in memory
      try {
        const onboardingContent = `
Parent Profile:
Name: ${name}
Experience Level: ${experienceLevel}
Stress Level: ${stressLevel}
${finalData.stressAssessment?.primaryConcerns ? `Primary Concerns: ${finalData.stressAssessment.primaryConcerns.join(", ")}` : ""}

${finalData.goals ? `
Goals:
${finalData.goals.shortTerm?.length ? `Short term: ${finalData.goals.shortTerm.join(", ")}` : ""}
${finalData.goals.longTerm?.length ? `Long term: ${finalData.goals.longTerm.join(", ")}` : ""}
${finalData.goals.supportAreas?.length ? `Support areas: ${finalData.goals.supportAreas.join(", ")}` : ""}
` : ""}`;

        await memoryService.createMemory(user.id, onboardingContent, {
          type: "onboarding_profile",
          category: "user_profile",
          source: "onboarding",
        });

      } catch (memoryError) {
        console.error("Failed to store onboarding data in memory:", memoryError);
        // Continue with database storage even if memory storage fails
      }

      // Insert or update parent profile
      const [profile] = await db
        .insert(parentProfiles)
        .values({
          userId: user.id,
          name,
          email,
          stressLevel: stressLevel as any,
          experienceLevel: experienceLevel as any,
          onboardingData: finalData,
          completedOnboarding: true,
          currentOnboardingStep: 4,
          primaryConcerns: finalData.stressAssessment?.primaryConcerns || [],
          supportNetwork,
        })
        .onConflictDoUpdate({
          target: parentProfiles.userId,
          set: {
            name,
            email,
            stressLevel: stressLevel as any,
            experienceLevel: experienceLevel as any,
            onboardingData: finalData,
            completedOnboarding: true,
            currentOnboardingStep: 4,
            primaryConcerns: finalData.stressAssessment?.primaryConcerns || undefined,
            supportNetwork,
            updatedAt: new Date(),
          },
        })
        .returning();

      res.json({
        message: "Onboarding completed successfully",
        profile,
      });
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      res.status(500).json({
        message: "Failed to complete onboarding",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
