import { Router } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }
};

export function setupRegisterRoute(router: Router) {
  router.post("/register", async (req, res, next) => {
    try {
      if (!req.body.username || !req.body.password || !req.body.email) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, req.body.username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await crypto.hash(req.body.password);
      const [newUser] = await db
        .insert(users)
        .values({
          username: req.body.username,
          email: req.body.email,
          password: hashedPassword,
          createdAt: new Date(),
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            profilePicture: newUser.profilePicture
          },
          redirect: "/welcome"
        });
      });
    } catch (error) {
      next(error);
    }
  });
}