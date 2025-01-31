import { Router } from "express";
import { db } from "@db";
import { parentProfiles } from "@db/schema";
import { eq } from "drizzle-orm";
import type { User } from "../../auth";
import path from "path";
import fs from "fs/promises";

export function setupParentProfileRoutes(router: Router) {
  // Profile picture upload endpoint
  router.post("/picture", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    const user = req.user as User;
    const file = req.files?.profilePicture;

    if (!file || Array.isArray(file)) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        message: "Invalid file type. Only JPEG, PNG, GIF and WebP images are allowed",
      });
    }

    if (file.size > 2 * 1024 * 1024) {
      return res.status(400).json({ message: "File size must be less than 2MB" });
    }

    try {
      // Create unique filename
      const fileName = `profile-${user.id}-${Date.now()}${path.extname(file.name)}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      const filePath = path.join(uploadDir, fileName);

      // Ensure uploads directory exists
      await fs.mkdir(uploadDir, { recursive: true });

      // Move uploaded file
      await file.mv(filePath);

      // Update user profile in database
      await db
        .update(parentProfiles)
        .set({ profilePicture: `/uploads/${fileName}` })
        .where(eq(parentProfiles.userId, user.id));

      res.json({ profilePicture: `/uploads/${fileName}` });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Get parent profile
  router.get("/", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;

    try {
      const profile = await db.query.parentProfiles.findFirst({
        where: eq(parentProfiles.userId, user.id),
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

  // Update parent profile
  router.put("/", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;
    const updates = req.body;

    try {
      const [updated] = await db
        .update(parentProfiles)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(parentProfiles.userId, user.id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Profile not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating parent profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  return router;
}
