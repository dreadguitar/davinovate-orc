import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../utils/db';
import xss from 'xss';

export const getAgents = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const result = await query(
      'SELECT * FROM agents WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get Agents error:', error);
    res.status(500).json({ message: 'Error fetching agents' });
  }
};

export const createAgent = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { name, system_prompt, model_config } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    const cleanName = xss(name);
    const cleanPrompt = system_prompt ? xss(system_prompt) : '';
    const result = await query(
      'INSERT INTO agents (user_id, name, system_prompt, model_config) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, cleanName, cleanPrompt, model_config || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create Agent error:', error);
    res.status(500).json({ message: 'Error creating agent' });
  }
};

export const updateAgent = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { name, system_prompt, model_config } = req.body;

  try {
    const cleanName = xss(name);
    const cleanPrompt = system_prompt ? xss(system_prompt) : '';
    const result = await query(
      'UPDATE agents SET name = $1, system_prompt = $2, model_config = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
      [cleanName, cleanPrompt, model_config, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update Agent error:', error);
    res.status(500).json({ message: 'Error updating agent' });
  }
};

export const deleteAgent = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  try {
    const result = await query(
      'DELETE FROM agents WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Delete Agent error:', error);
    res.status(500).json({ message: 'Error deleting agent' });
  }
};
