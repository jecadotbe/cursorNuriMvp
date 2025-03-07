import { Request, Response, NextFunction } from "express";
import { redisClient } from "../lib/session";

// Rate limit configuration by endpoint type
const RATE_LIMITS = {
  login: { maxAttempts: 5, blockDuration: 15 * 60, resetDuration: 60 * 60 }, // 5 attempts, 15 min block, 1 hour reset
  api: { maxAttempts: 100, blockDuration: 5 * 60, resetDuration: 60 * 60 }, // 100 attempts, 5 min block, 1 hour reset
  sensitive: { maxAttempts: 20, blockDuration: 10 * 60, resetDuration: 60 * 60 }, // 20 attempts, 10 min block, 1 hour reset
  default: { maxAttempts: 200, blockDuration: 5 * 60, resetDuration: 60 * 60 } // 200 attempts, 5 min block, 1 hour reset
};

// Helper to get rate limit key
const getRateLimitKey = (req: Request, type: string): string => {
  // For user-specific rate limits, include user ID if authenticated
  const userPart = req.user ? `:user:${req.user.id}` : '';
  return `rateLimit:${type}:${req.ip}${userPart}`;
};

// Generic rate limiter factory
export const createRateLimiter = (type: keyof typeof RATE_LIMITS = 'default') => {
  const config = RATE_LIMITS[type];
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = getRateLimitKey(req, type);
    
    try {
      // Get current count from Redis
      const currentValue = await redisClient.get(key);
      const attempts = currentValue ? parseInt(currentValue, 10) : 0;
      
      // Check if blocked
      const blockKey = `${key}:blocked`;
      const isBlocked = await redisClient.get(blockKey);
      
      if (isBlocked) {
        const ttl = await redisClient.ttl(blockKey);
        const waitTime = Math.ceil(ttl / 60);
        return res.status(429).json({
          message: `Too many requests. Please try again in ${waitTime} minutes.`,
          retryAfter: ttl
        });
      }
      
      // Increment counter
      const newValue = attempts + 1;
      await redisClient.set(key, newValue);
      
      // Set expiration if first request
      if (newValue === 1) {
        await redisClient.expire(key, config.resetDuration);
      }
      
      // Check if over limit
      if (newValue > config.maxAttempts) {
        await redisClient.set(blockKey, '1');
        await redisClient.expire(blockKey, config.blockDuration);
        return res.status(429).json({
          message: `Rate limit exceeded. Please try again in ${Math.ceil(config.blockDuration / 60)} minutes.`,
          retryAfter: config.blockDuration
        });
      }
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': config.maxAttempts.toString(),
        'X-RateLimit-Remaining': (config.maxAttempts - newValue).toString(),
        'X-RateLimit-Reset': (Math.floor(Date.now() / 1000) + await redisClient.ttl(key)).toString()
      });
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open to avoid blocking legitimate requests
      next();
    }
  };
};

// Specific rate limiters
export const loginRateLimiter = createRateLimiter('login');
export const apiRateLimiter = createRateLimiter('api');
export const sensitiveRateLimiter = createRateLimiter('sensitive');
export const defaultRateLimiter = createRateLimiter('default');

// Clear rate limit for a specific IP and type
export const clearRateLimit = async (ip: string, type: keyof typeof RATE_LIMITS = 'login') => {
  const key = `rateLimit:${type}:${ip}`;
  const blockKey = `${key}:blocked`;
  
  await redisClient.del(key);
  await redisClient.del(blockKey);
};

// For backward compatibility
export const clearLoginAttempts = (ip: string) => clearRateLimit(ip, 'login');