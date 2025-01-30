import { type Request, Response } from "express";
import { db } from "@db";
import { parentProfiles, childProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import mem0 from "mem0ai";

export async function getProfile(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).send("Not authenticated");
  }

  try {
    const [profile] = await db
      .select()
      .from(parentProfiles)
      .where(eq(parentProfiles.userId, req.user.id))
      .limit(1);

    if (!profile) {
      return res.status(404).send("Profile not found");
    }

    // Get child profiles
    const children = await db
      .select()
      .from(childProfiles)
      .where(eq(childProfiles.parentProfileId, profile.id));

    return res.json({
      ...profile,
      children,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).send("Internal server error");
  }
}

export async function updateProfile(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).send("Not authenticated");
  }

  const { basicInfo, stressAssessment, childProfiles: children, goals } = req.body;

  try {
    // Update parent profile
    const [updatedProfile] = await db
      .update(parentProfiles)
      .set({
        name: basicInfo.name,
        stressLevel: stressAssessment.stressLevel,
        experienceLevel: basicInfo.experienceLevel,
        primaryConcerns: stressAssessment.primaryConcerns,
        supportNetwork: stressAssessment.supportNetwork,
        updatedAt: new Date(),
      })
      .where(eq(parentProfiles.userId, req.user.id))
      .returning();

    // Update child profiles
    if (children && children.length > 0) {
      // Delete existing children
      await db
        .delete(childProfiles)
        .where(eq(childProfiles.parentProfileId, updatedProfile.id));

      // Insert new children
      await db.insert(childProfiles).values(
        children.map((child: any) => ({
          parentProfileId: updatedProfile.id,
          name: child.name,
          age: child.age,
          specialNeeds: child.specialNeeds || [],
        }))
      );
    }

    // Create memory update for mem0
    const content = `
Profile Update:
Basic Information:
Name: ${basicInfo.name}
Experience Level: ${basicInfo.experienceLevel}

Stress Assessment:
Stress Level: ${stressAssessment.stressLevel}
Primary Concerns: ${stressAssessment.primaryConcerns.join(', ')}
Support Network: ${stressAssessment.supportNetwork.join(', ')}

Child Profiles:
${children.map((child: any) => `- ${child.name} (Age: ${child.age})
                 ${child.specialNeeds?.length ? 'Special needs: ' + child.specialNeeds.join(', ') : 'No special needs'}`).join('\n')}

Goals:
Short Term: ${goals.shortTerm.join(', ')}
Long Term: ${goals.longTerm.join(', ')}
Support Areas: ${goals.supportAreas.join(', ')}
`;

    const metadata = {
      type: "profile_update",
      category: "user_profile",
      source: "profile_form",
      timestamp: new Date().toISOString(),
      metadata: {
        profileData: req.body,
      }
    };

    await mem0.addMemory(req.user.id.toString(), content, metadata);

    return res.json({
      ...updatedProfile,
      children,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).send("Internal server error");
  }
}
