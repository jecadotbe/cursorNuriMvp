import { Router, Response } from "express";
import { db } from "@db";
import { villageMembers, villageMemberMemories } from "@db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { handleRouteError } from "../utils/error-handler";
import { ensureAuthenticated } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";

// Create and export the village router
export const villageRouter = Router();

// Get all village members for current user
villageRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const members = await db.query.villageMembers.findMany({
      where: eq(villageMembers.userId, userId),
      orderBy: [desc(villageMembers.updatedAt)],
    });

    res.json(members);
  } catch (error) {
    handleRouteError(res, error, "Failed to fetch village members");
  }
});

// Create new village member
villageRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const { name, type, circle, category, contactFrequency } = req.body;
    if (!name || !type || circle === undefined) {
      return res.status(400).json({ message: "Name, type, and circle are required" });
    }

    // Add new village member
    const [newMember] = await db
      .insert(villageMembers)
      .values({
        userId,
        name,
        type,
        circle,
        category,
        contactFrequency,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json(newMember);
  } catch (error) {
    handleRouteError(res, error, "Failed to create village member");
  }
});

// Update village member
villageRouter.put("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const memberId = parseInt(req.params.id);
    if (isNaN(memberId)) {
      return res.status(400).json({ message: "Invalid member ID" });
    }

    // Check if member exists and belongs to user
    const existingMember = await db.query.villageMembers.findFirst({
      where: and(
        eq(villageMembers.id, memberId),
        eq(villageMembers.userId, userId)
      ),
    });

    if (!existingMember) {
      return res.status(404).json({ message: "Village member not found" });
    }

    // Update member
    const { name, type, circle, category, contactFrequency } = req.body;
    const [updatedMember] = await db
      .update(villageMembers)
      .set({
        name: name !== undefined ? name : existingMember.name,
        type: type !== undefined ? type : existingMember.type,
        circle: circle !== undefined ? circle : existingMember.circle,
        category: category !== undefined ? category : existingMember.category,
        contactFrequency: contactFrequency !== undefined ? contactFrequency : existingMember.contactFrequency,
        updatedAt: new Date(),
      })
      .where(and(
        eq(villageMembers.id, memberId),
        eq(villageMembers.userId, userId)
      ))
      .returning();

    res.json(updatedMember);
  } catch (error) {
    handleRouteError(res, error, "Failed to update village member");
  }
});

// Delete village member
villageRouter.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const memberId = parseInt(req.params.id);
    if (isNaN(memberId)) {
      return res.status(400).json({ message: "Invalid member ID" });
    }

    // Check if member exists and belongs to user
    const existingMember = await db.query.villageMembers.findFirst({
      where: and(
        eq(villageMembers.id, memberId),
        eq(villageMembers.userId, userId)
      ),
    });

    if (!existingMember) {
      return res.status(404).json({ message: "Village member not found" });
    }

    // Delete member memories first
    await db
      .delete(villageMemberMemories)
      .where(eq(villageMemberMemories.memberId, memberId));

    // Then delete the member
    await db
      .delete(villageMembers)
      .where(and(
        eq(villageMembers.id, memberId),
        eq(villageMembers.userId, userId)
      ));

    res.json({ message: "Village member deleted successfully" });
  } catch (error) {
    handleRouteError(res, error, "Failed to delete village member");
  }
});

// Get memories for a specific village member
villageRouter.get("/:id/memories", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const memberId = parseInt(req.params.id);
    if (isNaN(memberId)) {
      return res.status(400).json({ message: "Invalid member ID" });
    }

    // Check if member exists and belongs to user
    const existingMember = await db.query.villageMembers.findFirst({
      where: and(
        eq(villageMembers.id, memberId),
        eq(villageMembers.userId, userId)
      ),
    });

    if (!existingMember) {
      return res.status(404).json({ message: "Village member not found" });
    }

    // Get memories for this member
    const memories = await db.query.villageMemberMemories.findMany({
      where: eq(villageMemberMemories.memberId, memberId),
      orderBy: [desc(villageMemberMemories.createdAt)],
    });

    res.json(memories);
  } catch (error) {
    handleRouteError(res, error, "Failed to fetch memories");
  }
});

// Create memory for village member
villageRouter.post("/:id/memories", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const memberId = parseInt(req.params.id);
    if (isNaN(memberId)) {
      return res.status(400).json({ message: "Invalid member ID" });
    }

    // Check if member exists and belongs to user
    const existingMember = await db.query.villageMembers.findFirst({
      where: and(
        eq(villageMembers.id, memberId),
        eq(villageMembers.userId, userId)
      ),
    });

    if (!existingMember) {
      return res.status(404).json({ message: "Village member not found" });
    }

    const { title, content, emotionalImpact, tags } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Memory content is required" });
    }

    // Add memory
    const [newMemory] = await db
      .insert(villageMemberMemories)
      .values({
        memberId,
        title: title || "Untitled Memory",
        content,
        emotionalImpact: emotionalImpact || 3,
        tags: tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json(newMemory);
  } catch (error) {
    handleRouteError(res, error, "Failed to create memory");
  }
});

// Export the router setup function for the main router
export function setupVillageRouter(app: Router) {
  app.use("/village", villageRouter);
  return app;
}