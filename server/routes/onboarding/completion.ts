import { Router } from "express";
import { db } from "@db";
import { parentProfiles, villageMembers } from "@db/schema";
import { memoryService } from "../../services/memory";
import { handleRouteError } from "../utils/error-handler";
import { ensureAuthenticated } from "../middleware/auth";
import { AuthenticatedRequest, ChildProfile } from "../types";

export function setupCompletionRoutes(router: Router) {
  // Complete onboarding
  router.post("/complete", ensureAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Not authenticated" });
      
      const finalData = req.body;
      
      // Set session flag for suggestion refresh.
      if (req.session) {
        req.session.checkSuggestions = true;
        await req.session.save();
      }

      // Validate required fields.
      const { name, stressLevel, experienceLevel } = {
        name: finalData.basicInfo?.name,
        stressLevel: finalData.stressAssessment?.stressLevel,
        experienceLevel: finalData.basicInfo?.experienceLevel,
      };
      
      if (!name || !stressLevel || !experienceLevel) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate and process child profiles.
      let validatedChildProfiles: ChildProfile[] = [];
      if (Array.isArray(finalData.childProfiles)) {
        validatedChildProfiles = finalData.childProfiles.map((child: any) => {
          if (!child.name || typeof child.name !== "string") {
            throw new Error(`Invalid child name: ${JSON.stringify(child)}`);
          }
          if (
            typeof child.age !== "number" ||
            child.age < 0 ||
            child.age > 18
          ) {
            throw new Error(`Invalid age for ${child.name}: ${child.age}`);
          }
          if (!Array.isArray(child.specialNeeds)) {
            throw new Error(
              `Invalid special needs for ${child.name}: must be an array`,
            );
          }
          return {
            name: child.name,
            age: child.age,
            specialNeeds: child.specialNeeds,
          };
        });
      }
      
      // Store profile memory.
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // slight delay
        const onboardingContent = `
Parent Profile:
Name: ${name}
Experience Level: ${experienceLevel}
Stress Level: ${stressLevel}
${finalData.stressAssessment?.primaryConcerns ? `Primary Concerns: ${finalData.stressAssessment.primaryConcerns.join(", ")}` : ""}
${
  validatedChildProfiles.length > 0
    ? `Children:
${validatedChildProfiles
  .map(
    (child) =>
      `- ${child.name} (Age: ${child.age})${
        child.specialNeeds.length
          ? `, Special needs: ${child.specialNeeds.join(", ")}`
          : ""
      }`,
  )
  .join("\n")}`
    : "No children profiles specified"
}
${
  finalData.goals
    ? `
Goals:
${finalData.goals.shortTerm?.length ? `Short term: ${finalData.goals.shortTerm.join(", ")}` : ""}
${finalData.goals.longTerm?.length ? `Long term: ${finalData.goals.longTerm.join(", ")}` : ""}
`
    : ""
}
        `;
        await memoryService.createMemory(user.id, onboardingContent, {
          type: "onboarding_profile",
          category: "user_profile",
          source: "onboarding",
        });
      } catch (memoryError) {
        console.error("Memory storage error:", memoryError);
      }

      // Create village members from support network
      if (finalData.stressAssessment?.supportNetwork?.length) {
        const supportMembers = finalData.stressAssessment.supportNetwork
          .filter((member: string) => member.toLowerCase() !== "niemand")
          .map((member: string) => {
            // Determine member type and circle based on the name
            let type = "family";
            let circle = 2;
            let category: "informeel" | "formeel" | "inspiratie" =
              "informeel";

            if (member.toLowerCase().includes("school")) {
              type = "professional";
              circle = 3;
              category = "formeel";
            } else if (
              member.toLowerCase().includes("oma") ||
              member.toLowerCase().includes("opa")
            ) {
              type = "family";
              circle = 1;
              category = "informeel";
            }

            return {
              userId: user.id,
              name: member,
              type,
              circle,
              category,
              role:
                type === "family" ? "Family Support" : "Professional Support",
              positionAngle: (Math.random() * 2 * Math.PI).toString(),
              contactFrequency: "M" as const,
            };
          });

        // Insert all support members into the village
        if (supportMembers.length > 0) {
          await db.insert(villageMembers).values(supportMembers);
        }
      }

      // Upsert final parent profile.
      const [profile] = await db
        .insert(parentProfiles)
        .values({
          userId: user.id,
          name,
          stressLevel,
          experienceLevel,
          onboardingData: {
            ...finalData,
            childProfiles: validatedChildProfiles,
          },
          completedOnboarding: true,
          currentOnboardingStep: 4,
          primaryConcerns: finalData.stressAssessment?.primaryConcerns || [],
          supportNetwork: finalData.stressAssessment?.supportNetwork || [],
        })
        .onConflictDoUpdate({
          target: parentProfiles.userId,
          set: {
            name,
            stressLevel,
            experienceLevel,
            onboardingData: {
              ...finalData,
              childProfiles: validatedChildProfiles,
            },
            completedOnboarding: true,
            currentOnboardingStep: 4,
            primaryConcerns: finalData.stressAssessment?.primaryConcerns,
            supportNetwork: finalData.stressAssessment?.supportNetwork,
            updatedAt: new Date(),
          },
        })
        .returning();

      res.json({ message: "Onboarding completed successfully", profile });
    } catch (error) {
      handleRouteError(res, error, "Failed to complete onboarding");
    }
  });

  return router;
}