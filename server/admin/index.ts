import express from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

// This function sets up and returns the admin server
// We'll conditionally start it only in development mode
export function setupAdminServer() {
  const app = express();
  const ADMIN_PORT = parseInt(process.env.ADMIN_PORT || '3001', 10);

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

  // Only start the admin server if we're in development mode
  if (process.env.NODE_ENV !== 'production') {
    const server = app.listen(ADMIN_PORT, '0.0.0.0', () => {
      console.log(`Admin server running on port ${ADMIN_PORT}`);
    }).on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        console.log(`Admin port ${ADMIN_PORT} is in use, admin server will not be available`);
      } else {
        console.error('Admin server error:', e);
      }
    });
    
    return server;
  }
  
  return null;
}
