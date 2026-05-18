import { Request, Response } from 'express';
import { getModels } from '../services/aiService';

export const listModels = async (req: Request, res: Response) => {
  try {
    const models = await getModels();
    res.json({ models });
  } catch (error: any) {
    console.error('Error fetching models:', error.message);
    res.status(502).json({ message: 'Could not retrieve models from AI server', error: error.message });
  }
};
