import { Router } from "express";
import { db } from "@db";
import { users, adminActions } from "@db/schema";
import { requireAdmin } from "../../auth/admin";
import { desc, sql } from "drizzle-orm";
import { setupAdminAuthRoutes } from "./auth";

export function setupAdminRoutes(router: Router) {
  const adminRouter = Router();

  // Setup admin authentication routes
  setupAdminAuthRoutes(adminRouter);

  // Protect all admin routes with requireAdmin middleware
  adminRouter.use(requireAdmin);

  // Get all users
  adminRouter.get("/users", async (req, res) => {
    try {
      const usersList = await db.query.users.findMany({
        orderBy: desc(users.createdAt),
      });

      // Remove sensitive information
      const sanitizedUsers = usersList.map(({ password, ...user }) => user);

      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get user statistics
  adminRouter.get("/stats", async (req, res) => {
    try {
      const stats = await db.select({
        totalUsers: sql<number>`count(*)`,
        activeToday: sql<number>`sum(case when ${users.createdAt} >= now() - interval '1 day' then 1 else 0 end)`,
        admins: sql<number>`sum(case when ${users.isAdmin} = true then 1 else 0 end)`,
      }).from(users);

      res.json(stats[0]);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Log admin action
  adminRouter.post("/log", async (req, res) => {
    const adminUser = req.user as { id: number };
    const { actionType, targetType, targetId, details } = req.body;

    try {
      const [action] = await db.insert(adminActions).values({
        adminId: adminUser.id,
        actionType,
        targetType,
        targetId,
        details,
      }).returning();

      res.json(action);
    } catch (error) {
      console.error("Error logging admin action:", error);
      res.status(500).json({ message: "Failed to log admin action" });
    }
  });

  router.use("/admin", adminRouter);
}