import { Router } from "express";
import { db } from "@db";
import { villageMembers, type User } from "@db/schema";
import { eq, and } from "drizzle-orm";
import type { Request, Response } from "express";

// Create and export the router
export const villageRouter = Router();

// Add type for authenticated request
interface AuthenticatedRequest extends Request {
  user?: User;
}

// Get all village members for the current user
villageRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
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
villageRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, type, circle, category, contactFrequency, metadata, positionAngle = '0' } = req.body;

    const [member] = await db
      .insert(villageMembers)
      .values({
        userId,
        name,
        type,
        circle,
        category,
        contactFrequency,
        positionAngle,
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
villageRouter.put("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { name, type, circle, category, contactFrequency, metadata, positionAngle } = req.body;

    // Check if the village member belongs to the user
    const existingMember = await db
      .select()
      .from(villageMembers)
      .where(and(
        eq(villageMembers.id, parseInt(id)),
        eq(villageMembers.userId, userId)
      ))
      .limit(1);

    if (!existingMember.length) {
      return res.status(404).json({ message: "Village member not found" });
    }

    // Ensure positionAngle is always stored as a string
    const updatedPositionAngle = positionAngle?.toString() ?? existingMember[0].positionAngle;

    const [updated] = await db
      .update(villageMembers)
      .set({
        name,
        type,
        circle,
        category,
        contactFrequency,
        positionAngle: updatedPositionAngle,
        metadata,
        updatedAt: new Date(),
      })
      .where(and(
        eq(villageMembers.id, parseInt(id)),
        eq(villageMembers.userId, userId)
      ))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error updating village member:", error);
    res.status(500).json({ message: "Failed to update village member" });
  }
});

// Delete a village member
villageRouter.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;

    // Check if the village member belongs to the user
    const existingMember = await db
      .select()
      .from(villageMembers)
      .where(and(
        eq(villageMembers.id, parseInt(id)),
        eq(villageMembers.userId, userId)
      ))
      .limit(1);

    if (!existingMember.length) {
      return res.status(404).json({ message: "Village member not found" });
    }

    const [deleted] = await db
      .delete(villageMembers)
      .where(and(
        eq(villageMembers.id, parseInt(id)),
        eq(villageMembers.userId, userId)
      ))
      .returning();

    res.json(deleted);
  } catch (error) {
    console.error("Error deleting village member:", error);
    res.status(500).json({ message: "Failed to delete village member" });
  }
});