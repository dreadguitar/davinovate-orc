import { Router } from 'express';
import { getSkills, createSkill, updateSkill, deleteSkill } from '../controllers/skillController';
import { authMiddleware } from '../middleware/auth';
import { isolationMiddleware } from '../middleware/isolation';

const router = Router();

// Apply auth and isolation to all skill routes
router.use(authMiddleware as any);
router.use(isolationMiddleware as any);

router.get('/', getSkills);
router.post('/', createSkill);
router.put('/:id', updateSkill);
router.delete('/:id', deleteSkill);

export default router;
