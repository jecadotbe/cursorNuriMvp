import { Router } from "express";
import passport from "passport";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

export function setupAdminAuthRoutes(router: Router) {
  router.post("/login", async (req, res, next) => {
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    // First check if the user exists and is an admin
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, req.body.username))
      .limit(1);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Invalid admin credentials" });
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({ message: info.message || "Login failed" });
      }

      if (!user.isAdmin) {
        return res.status(403).json({ message: "You do not have admin privileges" });
      }

      req.login(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            isAdmin: user.isAdmin
          },
        });
      });
    })(req, res, next);
  });
}
