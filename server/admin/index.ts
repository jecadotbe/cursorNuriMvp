import express from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const app = express();
const ADMIN_PORT = 5001;
const scryptAsync = promisify(scrypt);

// Middleware for parsing JSON
app.use(express.json());

// API Key Authentication Middleware
const API_KEY = process.env.ADMIN_API_KEY || 'development-admin-key';

function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
}

// Helper function to hash passwords
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  verify: async (storedPassword: string, suppliedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  }
};

// Apply API key authentication to all routes
app.use(requireApiKey);

// Test route to verify admin access
app.get('/admin/test', (req, res) => {
  res.json({ message: 'Admin API is working' });
});

// User management routes
app.get('/admin/users', async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get a specific user
app.get('/admin/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create an admin user
app.post('/admin/users', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if username already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username)
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create new admin user
    const hashedPassword = await crypto.hash(password);
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email,
        password: hashedPassword,
        isAdmin: true,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json({
      message: 'Admin user created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        isAdmin: newUser.isAdmin
      }
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// Update a user (including promoting to admin)
app.put('/admin/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { isAdmin } = req.body;
    
    if (isAdmin === undefined) {
      return res.status(400).json({ error: 'isAdmin parameter is required' });
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, userId))
      .returning();

    res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete a user
app.delete('/admin/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user
    await db.delete(users).where(eq(users.id, userId));

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Start admin server
app.listen(ADMIN_PORT, '0.0.0.0', () => {
  console.log(`Admin server running on port ${ADMIN_PORT}`);
});
