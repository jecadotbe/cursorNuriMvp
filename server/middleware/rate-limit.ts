import { Request, Response, NextFunction } from "express";

// Simple in-memory store for rate limiting
// In production, Redis or a database would be more appropriate
const loginAttempts = new Map<string, RateLimitStore>();

interface RateLimitStore {
  attempts: number;
  resetTime: number;
  blocked: boolean;
}

// Rate limiting configuration
const MAX_ATTEMPTS = 5; // Max failed login attempts
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes block

/**
 * Middleware to limit login attempts to prevent brute force attacks
 */
export const loginRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  
  // Get record for this IP
  const record = loginAttempts.get(ip);
  
  if (record) {
    // Check if blocked
    if (record.blocked) {
      // Check if block has expired
      if (now > record.resetTime) {
        // Reset record
        loginAttempts.delete(ip);
        next();
      } else {
        // Still blocked
        const remainingTime = Math.ceil((record.resetTime - now) / 1000 / 60);
        return res.status(429).json({
          message: `Too many failed login attempts. Please try again in ${remainingTime} minutes.`
        });
      }
    } else {
      // Check if window has expired
      if (now > record.resetTime) {
        // Reset window
        const newRecord: RateLimitStore = {
          attempts: 0,
          resetTime: now + WINDOW_MS,
          blocked: false
        };
        loginAttempts.set(ip, newRecord);
      }
      
      // Continue as normal
      next();
    }
  } else {
    // No record for this IP, create a new one
    const newRecord: RateLimitStore = {
      attempts: 0,
      resetTime: now + WINDOW_MS,
      blocked: false
    };
    loginAttempts.set(ip, newRecord);
    next();
  }
};

/**
 * Update rate limiting store after failed login
 */
export const incrementLoginAttempts = (ip: string) => {
  const record = loginAttempts.get(ip);
  
  if (record) {
    // Increment attempts
    record.attempts += 1;
    
    // Check if exceeded max attempts
    if (record.attempts >= MAX_ATTEMPTS) {
      record.blocked = true;
      record.resetTime = Date.now() + BLOCK_DURATION_MS;
    }
    
    loginAttempts.set(ip, record);
  }
};

/**
 * Clear login attempts after successful login
 */
export const clearLoginAttempts = (ip: string) => {
  loginAttempts.delete(ip);
};