import { Router, Request, Response } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/**
 * Hash a password using scrypt with a random salt
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Setup register route
 * @param router Express router to attach routes to
 */
export function setupRegisterRoute(router: Router) {
  router.post("/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password } = req.body;

      // Validate inputs
      if (!username || !email || !password) {
        return res.status(400).json({ 
          message: "Username, email, and password are required" 
        });
      }

      // Check if username already exists
      const existingUserByUsername = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUserByUsername.length > 0) {
        return res.status(400).json({ 
          message: "Username already in use" 
        });
      }

      // Check if email already exists
      const existingUserByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUserByEmail.length > 0) {
        return res.status(400).json({ 
          message: "Email already in use" 
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create new user
      const newUser = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          createdAt: new Date(),
        })
        .returning();

      // Log in the new user
      req.login(newUser[0], (err) => {
        if (err) {
          console.error("Login error after registration:", err);
          return res.status(500).json({ message: "Error during login after registration" });
        }

        return res.status(201).json({
          message: "User registered successfully",
          user: {
            id: newUser[0].id,
            username: newUser[0].username,
            email: newUser[0].email,
          },
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });
}