import { Router, Request, Response } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { mem0Service } from "../../services/mem0";

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
      
      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Check if username is already taken
      const existingUsername = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      
      if (existingUsername.length > 0) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email is already registered
      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (existingEmail.length > 0) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user
      const result = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          profilePicture: null,
          createdAt: new Date()
        })
        .returning({ id: users.id, username: users.username, email: users.email, 
                    password: users.password, profilePicture: users.profilePicture, 
                    createdAt: users.createdAt });
      
      if (!result || result.length === 0) {
        return res.status(500).json({ message: "Error creating user" });
      }
      
      const user = result[0];
      
      // Create user in mem0 service (non-blocking)
      Promise.resolve().then(async () => {
        try {
          const success = await mem0Service.createUser(user.id, username, email);
          if (success) {
            console.log(`User ${user.id} successfully created in mem0`);
          } else {
            console.warn(`Failed to create user ${user.id} in mem0`);
          }
        } catch (memError) {
          console.error(`Error creating user ${user.id} in mem0:`, memError);
        }
      });
      
      // Log in the user automatically after registration
      req.login(user, (err) => {
        if (err) {
          console.error("Error during login after registration:", err);
          return res.status(500).json({ message: "Error logging in after registration" });
        }
        
        // Return success without sending password back
        return res.status(201).json({
          message: "Registration successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            createdAt: user.createdAt
          }
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
}