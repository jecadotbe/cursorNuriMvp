import { Router, Request, Response } from "express";
import { adminLogin, adminRegister, requireAdminAuth } from "./auth";
import { db } from "@db";
import { adminLogs, adminUsers } from "@db/admin-schema";
import { users, parentProfiles, chats } from "@db/schema";
import { desc, eq } from "drizzle-orm";

const adminRouter = Router();

// Admin Authentication Routes
adminRouter.post("/login", adminLogin);
adminRouter.post("/register", adminRegister); // Consider removing or protecting in production

// Protected Admin Routes
adminRouter.use(requireAdminAuth);

// User Management
adminRouter.get("/users", async (req: Request, res: Response) => {
  try {
    const allUsers = await db.query.users.findMany({
      orderBy: desc(users.createdAt),
      limit: 100,
    });

    res.json(allUsers.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      profilePicture: user.profilePicture,
    })));
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// User Details with Associated Data
adminRouter.get("/users/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = await db.query.parentProfiles.findFirst({
      where: eq(parentProfiles.userId, userId),
    });

    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, userId),
      orderBy: desc(chats.createdAt),
      limit: 10,
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        profilePicture: user.profilePicture,
      },
      profile,
      recentChats: userChats,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Failed to fetch user details" });
  }
});

// Admin Management
adminRouter.get("/admins", async (req: Request, res: Response) => {
  try {
    const admins = await db
      .select({
        id: adminUsers.id,
        username: adminUsers.username,
        email: adminUsers.email,
        isSuper: adminUsers.isSuper,
        createdAt: adminUsers.createdAt,
      })
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt));

    res.json(admins);
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Failed to fetch admins" });
  }
});

// Admin Logs
adminRouter.get("/logs", async (req: Request, res: Response) => {
  try {
    const logs = await db
      .select()
      .from(adminLogs)
      .orderBy(desc(adminLogs.createdAt))
      .limit(100);

    res.json(logs);
  } catch (error) {
    console.error("Error fetching admin logs:", error);
    res.status(500).json({ message: "Failed to fetch admin logs" });
  }
});

export { adminRouter };