import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@db";
import { adminUsers, type SelectAdmin } from "@db/admin-schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Environment variables check
const JWT_SECRET = process.env.ADMIN_JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("ADMIN_JWT_SECRET environment variable is required");
}

// Utility functions for password hashing
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashedPassword, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

interface AuthenticatedRequest extends Request {
  admin?: SelectAdmin;
}

// Authentication middleware
export function requireAdminAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decodedToken = jwt.verify(token, JWT_SECRET!) as { id: number };
    req.admin = { id: decodedToken.id } as SelectAdmin;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// Admin authentication handlers
export async function adminLogin(req: Request, res: Response) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);

    if (!admin || !(await comparePasswords(password, admin.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin.id }, JWT_SECRET!, { expiresIn: "1d" });

    return res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        isSuper: admin.isSuper,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Admin registration (should be protected or disabled in production)
export async function adminRegister(req: Request, res: Response) {
  const { username, password, email, isSuper } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const [existingAdmin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);

    if (existingAdmin) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await hashPassword(password);
    const [newAdmin] = await db
      .insert(adminUsers)
      .values({
        username,
        password: hashedPassword,
        email,
        isSuper: isSuper || false,
      })
      .returning();

    return res.status(201).json({
      message: "Admin created successfully",
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        email: newAdmin.email,
        isSuper: newAdmin.isSuper,
      },
    });
  } catch (error) {
    console.error("Admin registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}