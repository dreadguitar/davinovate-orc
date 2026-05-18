import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../utils/db';
import xss from 'xss';

export const getSkills = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const result = await query(
      'SELECT * FROM skills WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get Skills error:', error);
    res.status(500).json({ message: 'Error fetching skills' });
  }
};

export const createSkill = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { name, description, parameters_schema, action_code } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    const cleanName = xss(name);
    const cleanDesc = description ? xss(description) : '';
    const result = await query(
      'INSERT INTO skills (user_id, name, description, parameters_schema, action_code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, cleanName, cleanDesc, parameters_schema || {}, action_code]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create Skill error:', error);
    res.status(500).json({ message: 'Error creating skill' });
  }
};

export const updateSkill = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { name, description, parameters_schema, action_code } = req.body;

  try {
    const cleanName = xss(name);
    const cleanDesc = description ? xss(description) : '';
    const result = await query(
      'UPDATE skills SET name = $1, description = $2, parameters_schema = $3, action_code = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
      [cleanName, cleanDesc, parameters_schema, action_code, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update Skill error:', error);
    res.status(500).json({ message: 'Error updating skill' });
  }
};

export const deleteSkill = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  try {
    const result = await query(
      'DELETE FROM skills WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Delete Skill error:', error);
    res.status(500).json({ message: 'Error deleting skill' });
  }
};
