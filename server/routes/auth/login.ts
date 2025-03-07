import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { clearRateLimit } from '../../middleware/rate-limit';
import { UnauthorizedError } from '../../lib/error-handler';

/**
 * Login controller
 */
export const loginController = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('local', (err: Error, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return next(new UnauthorizedError(info?.message || 'Invalid credentials'));
    }
    
    req.login(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }
      
      // Clear rate limit on successful login
      clearRateLimit(req.ip, 'login');
      
      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture
        }
      });
    });
  })(req, res, next);
};

/**
 * Logout controller
 */
export const logoutController = (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      throw err;
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
};
