import { Router, Request, Response } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { handleRouteError } from "../utils/error-handler";

export function setupRegisterRoute(router: Router) {
  // Register route
  router.post("/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password } = req.body;
      
      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if username already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Check if email already exists
      const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingEmail) {
        return res.status(409).json({ message: "Email already registered" });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          createdAt: new Date(),
        })
        .returning();

      // Login the user
      req.login(newUser, (err) => {
        if (err) {
          console.error("Auto-login error:", err);
          return res.status(500).json({ message: "Error logging in after registration" });
        }

        // Return user info without password
        const { password, ...userWithoutPassword } = newUser;
        res.status(201).json({
          message: "Registration successful",
          user: userWithoutPassword,
        });
      });
    } catch (error) {
      handleRouteError(res, error, "Registration failed");
    }
  });

  return router;
}