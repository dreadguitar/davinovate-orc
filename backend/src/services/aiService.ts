import dotenv from 'dotenv';
dotenv.config();

const AI_API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const AI_MODEL = process.env.AI_MODEL || 'Gemma4';

const EMBEDDINGS_API_KEY = process.env.EMBEDDINGS_API_KEY || AI_API_KEY;
const EMBEDDINGS_BASE_URL = process.env.EMBEDDINGS_BASE_URL || AI_BASE_URL;
const EMBEDDINGS_MODEL = process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small';

interface EmbeddingResponse {
  data: {
    embedding: number[];
    index: number;
    object: string;
  }[];
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export const generateEmbedding = async (text: string): Promise<number[] | null> => {
  if (!EMBEDDINGS_API_KEY) {
    console.warn('EMBEDDINGS_API_KEY or AI_API_KEY is not configured for embeddings');
    return null;
  }

  try {
    const response = await fetch(`${EMBEDDINGS_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EMBEDDINGS_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDINGS_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.warn(`Embedding generation failed: ${JSON.stringify(error)}`);
      return null;
    }

    const data = (await response.json()) as EmbeddingResponse;
    return data.data[0].embedding;
  } catch (error) {
    console.warn(`Embedding generation error:`, error);
    return null;
  }
};

export const generateCompletion = async (messages: any[], tools?: any[], tool_choice?: any, stream = false) => {
  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY is not configured');
  }

  const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      tools,
      tool_choice,
      stream,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`AI Completion failed: ${JSON.stringify(error)}`);
  }

  return response;
};

export const getModels = async (): Promise<{ id: string; object: string; created?: number; owned_by?: string }[]> => {
  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY is not configured');
  }

  const response = await fetch(`${AI_BASE_URL}/models`, {
    headers: {
      'Authorization': `Bearer ${AI_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }

  const data = await response.json() as { data: any[]; object: string };

  // Compatible with both OpenAI format { data: [...] } and llama-server format (direct array or { data: [...] })
  const models = Array.isArray(data) ? data : (data.data || []);

  // Sort: chat models first, then by id alphabetically
  return models
    .filter((m: any) => m.id)
    .sort((a: any, b: any) => a.id.localeCompare(b.id));
};

