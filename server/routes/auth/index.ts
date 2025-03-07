import { Router } from "express";
import passport from 'passport';
import { validateLogin, validateRegister } from '../../middleware/validate';
import { loginRateLimiter, clearRateLimit } from '../../middleware/rate-limit';
import { asyncHandler } from '../../lib/error-handler';
import { registerController } from './register';
import { loginController, logoutController } from './login';
import { resetPasswordController, forgotPasswordController } from './password-reset';

const router = Router();

// Login route with rate limiting and validation
router.post('/login', 
  loginRateLimiter,
  validateLogin,
  asyncHandler(loginController)
);

// Register route with validation
router.post('/register', 
  validateRegister, 
  asyncHandler(registerController)
);

// Logout route
router.post('/logout', asyncHandler(logoutController));

// Password reset routes
router.post('/forgot-password', asyncHandler(forgotPasswordController));
router.post('/reset-password/:token', asyncHandler(resetPasswordController));

// Check authentication status
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        profilePicture: req.user.profilePicture
      }
    });
  }
  return res.json({ authenticated: false });
});

export const authRouter = router;
