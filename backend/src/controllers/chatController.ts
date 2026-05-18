import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { orchestrate } from '../services/orchestratorService';
import { query } from '../utils/db';

export const handleChatMessage = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id as string;
  const { agentId, message, conversationId } = req.body;

  if (!agentId || !message) {
    return res.status(400).json({ message: 'Agent ID and message are required' });
  }

  try {
    // 1. Ensure conversation exists or create one
    let convId = conversationId;
    if (!convId) {
      const convRes = await query(
        'INSERT INTO conversations (user_id, agent_id, title) VALUES ($1, $2, $3) RETURNING id',
        [userId, agentId, message.substring(0, 50)]
      );
      convId = convRes.rows[0].id;
    }

    // 2. Save User Message
    await query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [convId, 'user', message]
    );

    // 3. Orchestrate Response
    const { data } = await orchestrate(message, { userId, agentId, conversationId: convId });
    const reply = data.choices[0].message.content;

    // 4. Save Assistant Reply
    await query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [convId, 'assistant', reply]
    );

    res.json({
      conversationId: convId,
      reply,
      usage: (data as any).usage
    });

  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Error processing chat message', error: error.message });
  }
};

export const getConversations = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { agentId } = req.query;

  try {
    let q = 'SELECT * FROM conversations WHERE user_id = $1';
    let params = [userId];

    if (agentId) {
      q += ' AND agent_id = $2';
      params.push(agentId as string);
    }

    const result = await query(`${q} ORDER BY created_at DESC`, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversations' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  const { conversationId } = req.params;
  const userId = req.user?.id;

  try {
    // Verify ownership
    const conv = await query('SELECT id FROM conversations WHERE id = $1 AND user_id = $2', [conversationId, userId]);
    if (conv.rows.length === 0) return res.status(403).json({ message: 'Forbidden' });

    const result = await query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
};
