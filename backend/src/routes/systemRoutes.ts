import { Router } from 'express';
import { handleSystemCommand } from '../controllers/systemController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware as any);

router.post('/command', handleSystemCommand);

export default router;
