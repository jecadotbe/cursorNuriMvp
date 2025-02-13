import { Router } from "express";
import { db } from "../../db";
import { parentProfiles } from "@db/schema";
import { eq } from "drizzle-orm";

export function setupParentProfileRoutes(router: Router) {
  router.get("/", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, req.session.userId),
      });

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error fetching parent profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  return router;
}
