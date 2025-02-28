import { Router } from "express";
import { db } from "@db";
import { parentProfiles, villageMembers } from "@db/schema";
import { mem0Service } from "../../services/mem0";
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
      
      // Set session flag for suggestion refresh if property exists
      if (req.session && typeof req.session === 'object') {
        // Using type assertion to avoid TypeScript error
        (req.session as any).checkSuggestions = true;
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
      
      // Store onboarding completion in mem0 (non-blocking)
      Promise.resolve().then(async () => {
        try {
          const success = await mem0Service.storeOnboardingCompletion(user.id, {
            ...finalData,
            childProfiles: validatedChildProfiles
          });
          
          if (success) {
            console.log(`Onboarding completion successfully stored in mem0 for user ${user.id}`);
          } else {
            console.warn(`Failed to store onboarding completion in mem0 for user ${user.id}`);
          }
        } catch (memError) {
          console.error(`Error storing onboarding completion in mem0:`, memError);
        }
      });

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
              ...(typeof finalData === 'object' ? finalData : {}),
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