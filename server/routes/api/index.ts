import { Router } from 'express';
import notificationsRouter from './notifications';

const router = Router();

// Mount notification routes
router.use('/notifications', notificationsRouter);

export default router; 