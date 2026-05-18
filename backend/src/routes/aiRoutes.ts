import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { listModels } from '../controllers/aiController';

const router = Router();

// GET /api/ai/models — returns available models from the configured AI server
router.get('/models', authMiddleware, listModels);

export default router;
