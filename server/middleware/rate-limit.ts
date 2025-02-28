import { Request, Response, NextFunction } from "express";
import createMemoryStore from "memorystore";
import session from "express-session";

interface RateLimitStore {
  attempts: number;
  resetTime: number;
  blocked: boolean;
}

const MemoryStore = createMemoryStore(session);
const store = new MemoryStore<RateLimitStore>();

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const RESET_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export const loginRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = req.ip;
  const key = `rateLimit:${ip}`;

  store.get(key, (err, record) => {
    if (err) {
      console.error("Rate limit store error:", err);
      return next();
    }

    const now = Date.now();
    let newRecord: RateLimitStore;

    if (!record) {
      newRecord = {
        attempts: 1,
        resetTime: now + RESET_DURATION,
        blocked: false,
      };
    } else {
      // Check if block duration has passed
      if (record.blocked && now > record.resetTime) {
        newRecord = {
          attempts: 1,
          resetTime: now + RESET_DURATION,
          blocked: false,
        };
      } else {
        // Update existing record
        newRecord = {
          attempts: record.attempts + 1,
          resetTime: record.resetTime,
          blocked: record.attempts + 1 >= MAX_ATTEMPTS,
        };
      }
    }

    // Store the updated record
    store.set(key, newRecord);

    // Check if user is blocked
    if (newRecord.blocked) {
      const waitTime = Math.ceil((record?.resetTime - now) / 1000 / 60);
      return res.status(429).json({
        message: `Too many login attempts. Please try again in ${waitTime} minutes.`,
      });
    }

    // Attach attempt info to request for logging
    (req as any).rateLimitInfo = {
      attempts: newRecord.attempts,
      remaining: MAX_ATTEMPTS - newRecord.attempts,
    };

    next();
  });
};

export const clearLoginAttempts = (ip: string) => {
  const key = `rateLimit:${ip}`;
  // Using store.set with null to effectively clear the entry
  store.set(key, null);
};