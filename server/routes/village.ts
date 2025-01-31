import { Router, type Request, type Response } from "express";
import { db } from "@db";
import { villageMembers, type User } from "@db/schema";
import { eq, and } from "drizzle-orm";

export function setupVillageRouter(router: Router) {
  // Get all village members for the current user
  router.get("/", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user as User;

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const members = await db
        .select()
        .from(villageMembers)
        .where(eq(villageMembers.userId, user.id));

      res.json(members);
    } catch (error) {
      console.error("Error fetching village members:", error);
      res.status(500).json({ message: "Failed to fetch village members" });
    }
  });

  // Create a new village member
  router.post("/", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user as User;
      const { name, type, circle, category, contactFrequency, metadata, positionAngle = '0' } = req.body;

      const [member] = await db
        .insert(villageMembers)
        .values({
          userId: user.id,
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
  router.put("/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user as User;
      const { id } = req.params;
      const { name, type, circle, category, contactFrequency, metadata, positionAngle } = req.body;

      // Check if the village member belongs to the user
      const existingMember = await db
        .select()
        .from(villageMembers)
        .where(and(
          eq(villageMembers.id, parseInt(id)),
          eq(villageMembers.userId, user.id)
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
          eq(villageMembers.userId, user.id)
        ))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating village member:", error);
      res.status(500).json({ message: "Failed to update village member" });
    }
  });

  // Delete a village member
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user as User;
      const { id } = req.params;

      // Check if the village member belongs to the user
      const existingMember = await db
        .select()
        .from(villageMembers)
        .where(and(
          eq(villageMembers.id, parseInt(id)),
          eq(villageMembers.userId, user.id)
        ))
        .limit(1);

      if (!existingMember.length) {
        return res.status(404).json({ message: "Village member not found" });
      }

      const [deleted] = await db
        .delete(villageMembers)
        .where(and(
          eq(villageMembers.id, parseInt(id)),
          eq(villageMembers.userId, user.id)
        ))
        .returning();

      res.json(deleted);
    } catch (error) {
      console.error("Error deleting village member:", error);
      res.status(500).json({ message: "Failed to delete village member" });
    }
  });

  return router;
}

// Export function to get village context for other modules
export async function getVillageContext(userId: number): Promise<string> {
  try {
    const members = await db
      .select()
      .from(villageMembers)
      .where(eq(villageMembers.userId, userId));

    if (!members.length) {
      return "No village members found.";
    }

    const contextString = members
      .map(member => (
        `${member.name} (${member.type}): ${member.category} - Contact: ${member.contactFrequency}`
      ))
      .join("\n");

    return `User's Village:\n${contextString}`;
  } catch (error) {
    console.error("Error getting village context:", error);
    return "Error retrieving village context.";
  }
}