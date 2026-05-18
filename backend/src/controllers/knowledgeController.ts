import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../utils/db';
import { generateEmbedding } from '../services/aiService';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse').PDFParse;
import fs from 'fs';

export const uploadKnowledge = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const file = req.file;
  const { agent_id, filename } = req.body;

  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    let content = '';

    // Extract text based on file type
    if (file.mimetype === 'application/pdf') {
      const parser = new pdfParse(new Uint8Array(file.buffer));
      const data = await parser.getText();
      content = data.text;
    } else {
      content = file.buffer.toString('utf8');
    }

    // Basic chunking (for demo purposes, keeping it simple)
    // In a real app, we'd use cleaner recursive chunking
    const chunks = content.match(/[\s\S]{1,1000}/g) || [content];

    console.log(`Processing ${chunks.length} chunks for file: ${file.originalname}`);

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;

      const embedding = await generateEmbedding(chunk);
      const vectorStr = embedding ? `[${embedding.join(',')}]` : null;

      await query(
        `INSERT INTO knowledge (user_id, agent_id, filename, content_text, embedding, metadata) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          agent_id || null,
          filename || file.originalname,
          chunk,
          vectorStr,
          JSON.stringify({ size: file.size, type: file.mimetype })
        ]
      );
    }

    res.status(201).json({ message: 'Knowledge base updated successfully', chunks: chunks.length });
  } catch (error: any) {
    console.error('Upload knowledge error:', error);
    res.status(500).json({ message: 'Error processing file', error: error.message });
  }
};

export const getKnowledge = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const result = await query(
      'SELECT id, filename, created_at, metadata FROM knowledge WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get knowledge error:', error);
    res.status(500).json({ message: 'Error fetching knowledge items' });
  }
};

export const deleteKnowledge = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  try {
    await query('DELETE FROM knowledge WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ message: 'Knowledge item deleted' });
  } catch (error) {
    console.error('Delete knowledge error:', error);
    res.status(500).json({ message: 'Error deleting knowledge' });
  }
};
