import { Request, Response, NextFunction } from 'express';
import { db } from '@db';
import { users } from '@db/schema';
import { crypto } from '../../lib/crypto';
import { ConflictError } from '../../lib/error-handler';
import { eq } from 'drizzle-orm';

/**
 * Register controller
 */
export const registerController = async (req: Request, res: Response, next: NextFunction) => {
  const { username, email, password } = req.body;
  
  try {
    // Check if username already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    
    if (existingUser) {
      throw new ConflictError('Username already exists');
    }
    
    // Check if email already exists
    const existingEmail = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    
    if (existingEmail) {
      throw new ConflictError('Email already exists');
    }
    
    // Hash password
    const hashedPassword = await crypto.hash(password);
    
    // Create user
    const [newUser] = await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
    }).returning({
      id: users.id,
      username: users.username,
      email: users.email,
      profilePicture: users.profilePicture,
      createdAt: users.createdAt
    });
    
    // Log in the user
    req.login(newUser, (err) => {
      if (err) {
        return next(err);
      }
      
      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          profilePicture: newUser.profilePicture
        }
      });
    });
  } catch (error) {
    next(error);
  }
};