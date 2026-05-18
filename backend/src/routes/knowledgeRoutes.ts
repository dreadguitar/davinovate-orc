import { Router } from 'express';
import multer from 'multer';
import { uploadKnowledge, getKnowledge, deleteKnowledge } from '../controllers/knowledgeController';
import { authMiddleware } from '../middleware/auth';
import { isolationMiddleware } from '../middleware/isolation';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply auth and isolation
router.use(authMiddleware as any);
router.use(isolationMiddleware as any);

router.post('/upload', upload.single('file'), uploadKnowledge);
router.get('/', getKnowledge);
router.delete('/:id', deleteKnowledge);

export default router;
