import { Router } from "express";
import { db } from "../../db";
import { parentProfiles } from "@db/schema";
import { eq } from "drizzle-orm";

export function setupChildProfileRoutes(router: Router) {
  router.get("/", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const parentProfile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, req.session.userId),
      });

      if (!parentProfile?.onboardingData?.childProfiles) {
        return res.json([]);
      }

      res.json(parentProfile.onboardingData.childProfiles);
    } catch (error) {
      console.error("Error fetching child profiles:", error);
      res.status(500).json({ message: "Failed to fetch child profiles" });
    }
  });

  return router;
}
