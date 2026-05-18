import { Router } from 'express';
import { getAgents, createAgent, updateAgent, deleteAgent } from '../controllers/agentController';
import { authMiddleware } from '../middleware/auth';
import { isolationMiddleware } from '../middleware/isolation';

const router = Router();

// Apply auth and isolation to all agent routes
router.use(authMiddleware as any);
router.use(isolationMiddleware as any);

router.get('/', getAgents);
router.post('/', createAgent);
router.put('/:id', updateAgent);
router.delete('/:id', deleteAgent);

export default router;
