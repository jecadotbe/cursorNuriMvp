import { Router } from "express";
import { db } from "@db";
import { villageMembers } from "@db/schema";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

const router = Router();

// Get all village members for the current user
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const members = await db
      .select()
      .from(villageMembers)
      .where(eq(villageMembers.userId, userId));

    res.json(members);
  } catch (error) {
    console.error("Error fetching village members:", error);
    res.status(500).json({ message: "Failed to fetch village members" });
  }
});

// Create a new village member
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, type, circle, category, contactFrequency, metadata } = req.body;

    const [member] = await db
      .insert(villageMembers)
      .values({
        userId,
        name,
        type,
        circle,
        category,
        contactFrequency,
        metadata,
      })
      .returning();

    res.status(201).json(member);
  } catch (error) {
    console.error("Error creating village member:", error);
    res.status(500).json({ message: "Failed to create village member" });
  }
});

// Update a village member
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { name, type, circle, category, contactFrequency, metadata } = req.body;

    const [updated] = await db
      .update(villageMembers)
      .set({
        name,
        type,
        circle,
        category,
        contactFrequency,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(villageMembers.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Village member not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating village member:", error);
    res.status(500).json({ message: "Failed to update village member" });
  }
});

// Delete a village member
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;

    const [deleted] = await db
      .delete(villageMembers)
      .where(eq(villageMembers.id, parseInt(id)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ message: "Village member not found" });
    }

    res.json(deleted);
  } catch (error) {
    console.error("Error deleting village member:", error);
    res.status(500).json({ message: "Failed to delete village member" });
  }
});

export default router;
