import { Router } from 'express';
import { handleChatMessage, getConversations, getMessages } from '../controllers/chatController';
import { authMiddleware } from '../middleware/auth';
import { isolationMiddleware } from '../middleware/isolation';

const router = Router();

router.use(authMiddleware as any);
router.use(isolationMiddleware as any);

router.post('/message', handleChatMessage);
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId/messages', getMessages);

export default router;
