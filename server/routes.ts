import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { Router } from "express";
import { setupAuthRoutes } from "./routes/auth";
import { setupChatRouter } from "./routes/chat";
import { setupProfileRouter } from "./routes/profile";
import { villageRouter } from "./routes/village";
import { adminRouter } from "./admin/routes";
import fileUpload from "express-fileupload";

export function registerRoutes(app: Express): Server {
  // Add file upload middleware
  app.use(
    fileUpload({
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max file size
      abortOnLimit: true,
      createParentPath: true,
    }),
  );

  // Mount admin routes separately from main routes
  app.use("/admin-api", adminRouter);

  // Setup authentication and session management
  setupAuth(app);

  // Create base router
  const baseRouter = Router();

  // Mount regular route modules
  baseRouter.use("/auth", setupAuthRoutes(baseRouter));
  baseRouter.use("/chat", setupChatRouter(baseRouter));
  baseRouter.use("/profile", setupProfileRouter(baseRouter));
  baseRouter.use("/village", villageRouter);

  // Mount all routes under /api
  app.use("/api", baseRouter);

  return createServer(app);
}

// ==========================================
// Helper: Get Village Context
// ==========================================
async function getVillageContext(userId: number): Promise<string | null> {
  try {
    const members = await db.query.villageMembers.findMany({
      where: eq(villageMembers.userId, userId),
    });
    if (members.length === 0) {
      return null;
    }
    const memberNames = members.map((member) => member.name).join(", ");
    return `\n\nVillage Members: ${memberNames}`;
  } catch (error) {
    console.error("Error fetching village context:", error);
    return null;
  }
}