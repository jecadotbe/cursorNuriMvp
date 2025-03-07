import { Router } from 'express';
import { authRouter } from './auth';
import { profileRouter } from './profile';
import { chatRouter } from './chat';
import { villageRouter } from './village';
import { apiRouter } from './api';
import { learningRouter } from './learning';
import { adminRouter } from './admin';
import { ensureAuthenticated } from '../middleware/auth';
import { setupNotificationRoutes } from './notifications';

// Create the main router
const router = Router();

// Public routes
router.use('/auth', authRouter);

// Protected routes
router.use('/api', apiRouter);
router.use('/profile', ensureAuthenticated, profileRouter);
router.use('/chat', ensureAuthenticated, chatRouter);
router.use('/village', ensureAuthenticated, villageRouter);
router.use('/learning', ensureAuthenticated, learningRouter);
router.use('/admin', ensureAuthenticated, adminRouter);

// Notification routes
const notificationRouter = Router();
setupNotificationRoutes(notificationRouter);
router.use('/notifications', ensureAuthenticated, notificationRouter);

// Export the router
export default router;

// Export the register function for the main app
export function registerRoutes(app: any) {
  // Mount the main router
  app.use(router);
  
  // Return the app for chaining
  return app;
}