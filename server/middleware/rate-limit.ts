import { Request, Response, NextFunction } from "express";

// Store for rate limiting by IP address
// In a production app, this should be moved to Redis or another persistent store
const loginAttempts = new Map<string, RateLimitStore>();

// Max login attempts before blocking
const MAX_ATTEMPTS = 5;
// Lockout period in milliseconds (15 minutes)
const LOCKOUT_TIME = 15 * 60 * 1000;
// Time window for counting attempts in milliseconds (1 hour)
const ATTEMPT_WINDOW = 60 * 60 * 1000;

interface RateLimitStore {
  attempts: number;
  resetTime: number;
  blocked: boolean;
}

/**
 * Middleware to limit login attempts to prevent brute force attacks
 */
export const loginRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Use IP address as identifier (could be enhanced with additional factors)
  const ip = req.ip;
  
  // Skip if no IP available
  if (!ip) {
    return next();
  }
  
  const now = Date.now();
  
  // Get current record or create a new one
  const currentRecord = loginAttempts.get(ip);
  
  // If user is in blocked state
  if (currentRecord && currentRecord.blocked) {
    // Check if block period has expired
    if (now < currentRecord.resetTime) {
      const minutesLeft = Math.ceil((currentRecord.resetTime - now) / 60000);
      return res.status(429).json({
        message: `Too many login attempts. Please try again in ${minutesLeft} minute(s).`
      });
    } else {
      // Reset after lockout period
      const newRecord: RateLimitStore = {
        attempts: 0,
        resetTime: now + ATTEMPT_WINDOW,
        blocked: false
      };
      loginAttempts.set(ip, newRecord);
    }
  } else if (currentRecord) {
    // If record exists but not blocked
    // Check if attempt window has expired
    if (now > currentRecord.resetTime) {
      // Reset counters for a new period
      currentRecord.attempts = 0;
      currentRecord.resetTime = now + ATTEMPT_WINDOW;
    }
    
    loginAttempts.set(ip, currentRecord);
  } else {
    // No existing record, create a new one
    loginAttempts.set(ip, {
      attempts: 0,
      resetTime: now + ATTEMPT_WINDOW,
      blocked: false
    });
  }
  
  next();
};

/**
 * Update rate limiting store after failed login
 */
export const incrementLoginAttempts = (ip: string) => {
  if (!ip) return;
  
  const record = loginAttempts.get(ip);
  if (!record) return;
  
  record.attempts += 1;
  
  // Block if too many attempts
  if (record.attempts >= MAX_ATTEMPTS) {
    record.blocked = true;
    record.resetTime = Date.now() + LOCKOUT_TIME;
  }
  
  loginAttempts.set(ip, record);
};

/**
 * Clear login attempts after successful login
 */
export const clearLoginAttempts = (ip: string) => {
  if (ip) {
    loginAttempts.delete(ip);
  }
};