import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../lib/error-handler';

/**
 * Middleware to ensure the user is authenticated
 */
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  throw new UnauthorizedError('Authentication required');
};

/**
 * Middleware to ensure the user has admin role
 */
export const ensureAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user && (req.user as any).role === 'admin') {
    return next();
  }
  throw new ForbiddenError('Admin access required');
};

/**
 * Middleware to ensure the user owns the resource
 * @param getResourceUserId Function to extract the user ID from the request
 */
export const ensureOwnership = (getResourceUserId: (req: Request) => Promise<number | null>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      
      const resourceUserId = await getResourceUserId(req);
      
      if (resourceUserId === null) {
        throw new UnauthorizedError('Resource not found');
      }
      
      if (resourceUserId !== (req.user as any).id) {
        throw new ForbiddenError('You do not have permission to access this resource');
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}; 