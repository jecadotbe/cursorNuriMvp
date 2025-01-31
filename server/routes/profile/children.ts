import { Router } from "express";
import { db } from "@db";
import { childProfiles } from "@db/schema";
import { eq, and } from "drizzle-orm";
import type { User } from "../../auth";

export function setupChildProfileRoutes(router: Router) {
  // Get all child profiles for a parent
  router.get("/", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;

    try {
      const profiles = await db.query.childProfiles.findMany({
        where: eq(childProfiles.parentProfileId, user.id),
      });

      res.json(profiles);
    } catch (error) {
      console.error("Error fetching child profiles:", error);
      res.status(500).json({ message: "Failed to fetch child profiles" });
    }
  });

  // Create a new child profile
  router.post("/", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;
    const childData = req.body;

    try {
      const [child] = await db
        .insert(childProfiles)
        .values({
          ...childData,
          parentProfileId: user.id,
        })
        .returning();

      res.json(child);
    } catch (error) {
      console.error("Error creating child profile:", error);
      res.status(500).json({ message: "Failed to create child profile" });
    }
  });

  // Update a child profile
  router.put("/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;
    const childId = parseInt(req.params.id);
    const updates = req.body;

    if (isNaN(childId)) {
      return res.status(400).json({ message: "Invalid child profile ID" });
    }

    try {
      const [updated] = await db
        .update(childProfiles)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(childProfiles.id, childId),
            eq(childProfiles.parentProfileId, user.id)
          )
        )
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Child profile not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating child profile:", error);
      res.status(500).json({ message: "Failed to update child profile" });
    }
  });

  // Get a specific child profile
  router.get("/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;
    const childId = parseInt(req.params.id);

    if (isNaN(childId)) {
      return res.status(400).json({ message: "Invalid child profile ID" });
    }

    try {
      const profile = await db.query.childProfiles.findFirst({
        where: and(
          eq(childProfiles.id, childId),
          eq(childProfiles.parentProfileId, user.id)
        ),
      });

      if (!profile) {
        return res.status(404).json({ message: "Child profile not found" });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error fetching child profile:", error);
      res.status(500).json({ message: "Failed to fetch child profile" });
    }
  });

  return router;
}
