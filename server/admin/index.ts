import express from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

const app = express();
const ADMIN_PORT = 5001;

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

// Apply API key authentication to all routes
app.use(requireApiKey);

// Test route to verify admin access
app.get('/admin/test', (req, res) => {
  res.json({ message: 'Admin API is working' });
});

// Basic user management routes
app.get('/admin/users', async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Start admin server
app.listen(ADMIN_PORT, '0.0.0.0', () => {
  console.log(`Admin server running on port ${ADMIN_PORT}`);
});
