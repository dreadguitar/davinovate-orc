import { Request, Response } from 'express';
import { generateCompletion, generateEmbedding, getModels } from '../services/aiService';
import { query } from '../utils/db';
import { AuthRequest } from '../middleware/auth';
import xss from 'xss';
import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const turndownService = new TurndownService();

// =========================================================
// TOOL DEFINITIONS — given to the LLM
// =========================================================
export const SYSTEM_TOOLS = [
  // --- Navigation & UI ---
  {
    type: 'function',
    function: {
      name: 'navigate_to',
      description: 'Navigate the user to a specific section of the Davinovate UI.',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            enum: ['agents', 'skills', 'knowledge', 'chat'],
            description: 'The section to navigate to.'
          },
          reason: { type: 'string', description: 'Brief reason for navigating.' }
        },
        required: ['target']
      }
    }
  },

  // --- Confirmation gate ---
  {
    type: 'function',
    function: {
      name: 'request_confirmation',
      description: 'Show the user a summary of what you are about to create and ask them to confirm before proceeding. You MUST call this before any create_* tool.',
      parameters: {
        type: 'object',
        properties: {
          resource_type: {
            type: 'string',
            enum: ['agent', 'skill', 'knowledge'],
            description: 'What kind of resource will be created.'
          },
          summary: {
            type: 'string',
            description: 'A clear, human-readable summary of what will be created, including all relevant fields. Use markdown formatting.'
          },
          payload: {
            type: 'object',
            description: 'The exact JSON payload that will be used to create the resource, so it can be passed to the create tool after confirmation.'
          }
        },
        required: ['resource_type', 'summary', 'payload']
      }
    }
  },

  // --- Create Agent ---
  {
    type: 'function',
    function: {
      name: 'create_agent',
      description: 'Create a new AI agent. ONLY call this after the user has explicitly confirmed (e.g. said "yes", "ok", "go ahead").',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Agent name.' },
          system_prompt: { type: 'string', description: 'The full system prompt for the agent.' },
          model: { type: 'string', description: 'The model ID to use.' },
          temperature: { type: 'number', description: 'Temperature (0.0 to 1.0). Default 0.7.' }
        },
        required: ['name', 'system_prompt']
      }
    }
  },

  // --- Create Skill ---
  {
    type: 'function',
    function: {
      name: 'create_skill',
      description: 'Create a new skill/tool for agents. ONLY call this after the user has explicitly confirmed.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Skill name (snake_case recommended, e.g. search_web).' },
          description: { type: 'string', description: 'What this skill does. This is what the AI reads to decide when to call it.' },
          parameters_schema: {
            type: 'object',
            description: 'JSON Schema object defining the parameters this skill accepts.',
          },
          action_code: {
            type: 'string',
            description: 'JavaScript async function named "perform" that receives a params object and returns a result. Example: async function perform(params) { return params.input.toUpperCase(); }'
          }
        },
        required: ['name', 'description', 'parameters_schema', 'action_code']
      }
    }
  },

  // --- Add Knowledge (text) ---
  {
    type: 'function',
    function: {
      name: 'add_knowledge_text',
      description: 'Add a text-based knowledge entry to the RAG knowledge base. ONLY call this after the user has explicitly confirmed.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'A title or filename label for this knowledge entry.' },
          content: { type: 'string', description: 'The raw text content to embed and store. Can be documentation, instructions, facts, etc.' }
        },
        required: ['title', 'content']
      }
    }
  },
  // --- System Context / Registry ---
  {
    type: 'function',
    function: {
      name: 'get_system_registry',
      description: 'Fetch the list of existing agents, skills, knowledge entries, and available models to provide better recommendations and context aware help.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  // --- Web Scraping ---
  {
    type: 'function',
    function: {
      name: 'scrape_url',
      description: 'Fetch and extract text content from a specific web URL to gather information.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The absolute URL to scrape (starting with http or https).' }
        },
        required: ['url']
      }
    }
  }
];

// =========================================================
// SYSTEM PROMPT
// =========================================================
export const SYSTEM_PROMPT = `
You are Orion, an intelligent assistant inside the Davinovate AI Orchestrator — a platform for managing AI agents, skills, and knowledge bases.

YOUR DUAL ROLE:
1. CONVERSATIONAL GUIDE: Answer questions, recommend best practices for agent design, prompt engineering, RAG, and tool/skill creation. Be concise and helpful. Respond in the same language as the user.
2. RESOURCE CREATOR: When the user wants to create an agent, skill, or add knowledge, guide them through the required fields conversationally — then use request_confirmation before actually creating anything.

CREATION FLOWS:

**Creating an Agent:**
Required: name, system_prompt. Optional: model (default: first available), temperature (default: 0.7).
- Gather fields conversationally if not provided.
- Call request_confirmation with a summary.
- Only call create_agent AFTER the user says "yes", "confirm", "go ahead", or similar.

**Creating a Skill:**
Required: name (snake_case), description, parameters_schema (as JSON), action_code (JavaScript async function).
- Help the user define what the skill does and what parameters it needs.
- Generate the parameters_schema and action_code based on their description if needed.
- Call request_confirmation with a complete summary.
- Only call create_skill AFTER explicit user confirmation.

**Adding Knowledge:**
Required: title, content (pasted text, facts, documentation, etc.).
- The user provides raw text content to embed into the RAG knowledge base.
- Call request_confirmation.
- Only call add_knowledge_text AFTER explicit user confirmation.

GENERAL RULES:
- IMPORTANT: Always respond to the user in the language they used to speak to you. If they speak in Spanish, reply in Spanish. If they speak in English, reply in English.
- Use get_system_registry to know what assets the user already has (agents, skills, knowledge) and what LLM models are available for configuring new agents.
- Never call create_* tools without calling request_confirmation first.
- If the user says "no", "cancel", or "stop" after a confirmation, abandon the creation.
- If the user asks you to navigate or go to a specific section (agents, skills, knowledge, or chat), YOU MUST use the navigate_to tool. Do not just reply saying you navigated.
- Navigate to the relevant section automatically after a successful creation.
- Use markdown in your text responses (bold, lists, code blocks).
- Keep responses concise but complete.
- When creating an agent, try to use a model that actually exists (get this from get_system_registry).
- If the user asks for information from the web, use scrape_url to fetch it.
- IMPORTANT: Always start your final conversational response with [ES] if speaking Spanish or [EN] if speaking English.
`;

// =========================================================
export async function executeTool(toolName: string, args: any, userId: string): Promise<{ action: string; text: string; data?: any; target?: string }> {

  if (toolName === 'navigate_to') {
    return {
      action: 'NAVIGATE',
      target: args.target,
      text: args.reason || `Navigating to ${args.target}.`
    } as any;
  }

  if (toolName === 'request_confirmation') {
    return {
      action: 'CONFIRM',
      resource_type: args.resource_type,
      payload: args.payload,
      text: args.summary
    } as any;
  }

  if (toolName === 'create_agent') {
    const { name, system_prompt, model = 'Gemma4', temperature = 0.7 } = args;
    const result = await query(
      'INSERT INTO agents (user_id, name, system_prompt, model_config) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, name, system_prompt, { model, temperature }]
    );
    const agent = result.rows[0];
    return {
      action: 'CREATED',
      type: 'agent',
      data: agent,
      text: `✅ Agent **${agent.name}** has been created successfully! You can now chat with it in Studio Chat or edit it anytime.`
    } as any;
  }

  if (toolName === 'create_skill') {
    const { name, description, parameters_schema, action_code } = args;
    const result = await query(
      'INSERT INTO skills (user_id, name, description, parameters_schema, action_code) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, name, description, parameters_schema, action_code]
    );
    const skill = result.rows[0];
    return {
      action: 'CREATED',
      type: 'skill',
      data: skill,
      text: `✅ Skill **${skill.name}** has been registered! Agents can now use it as a tool when it's assigned to them.`
    } as any;
  }

  if (toolName === 'add_knowledge_text') {
    const { title, content } = args;
    const chunks = content.match(/[\s\S]{1,1000}/g) || [content];
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const embedding = await generateEmbedding(chunk);
      if (!embedding) continue;
      await query(
        `INSERT INTO knowledge (user_id, agent_id, filename, content_text, embedding, metadata) VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, null, title, chunk, `[${embedding.join(',')}]`, JSON.stringify({ source: 'orion_bot', type: 'text' })]
      );
    }
    return {
      action: 'CREATED',
      type: 'knowledge',
      data: { title, chunks: chunks.length },
      text: `✅ Knowledge entry **"${title}"** has been indexed (${chunks.length} chunk${chunks.length !== 1 ? 's' : ''}). Your agents will now use this in their RAG context.`
    } as any;
  }

  if (toolName === 'get_system_registry') {
    const agents = await query('SELECT id, name, model_config FROM agents WHERE user_id = $1', [userId]);
    const skills = await query('SELECT id, name, description FROM skills WHERE user_id = $1', [userId]);
    const knowledge = await query('SELECT id, filename FROM knowledge WHERE user_id = $1 GROUP BY id, filename', [userId]);
    const models = await getModels();

    const registry = {
      agents: agents.rows,
      skills: skills.rows,
      knowledge: knowledge.rows,
      available_models: models.map(m => m.id)
    };

    return {
      action: 'CHAT',
      text: `Registry information fetched.`,
      data: registry
    } as any;
  }

  if (toolName === 'scrape_url') {
    const { url } = args;
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 15000 // Increased timeout
      });

      const $ = cheerio.load(response.data);

      // Remove scripts, styles, and other noise
      $('script, style, iframe, noscript, nav, footer, header, aside, .sidebar, .nav, .menu').remove();

      // Attempt to find the main content
      let mainContent = $('main, article, #content, .content, .post-content').html();
      if (!mainContent) {
        mainContent = $('body').html();
      }

      if (!mainContent) {
        throw new Error('Could not find content to scrape.');
      }

      let markdown = '';
      try {
        markdown = turndownService.turndown(mainContent);
      } catch (e) {
        // Fallback if turndown fails
        markdown = $('body').text().replace(/\s+/g, ' ').trim();
      }

      // Truncate to avoid context window issues (approx 6k chars)
      const truncated = markdown.length > 6000 ? markdown.substring(0, 6000) + '... [Content truncated]' : markdown;

      return {
        action: 'CHAT',
        text: `Content scraped from ${url}. I will now summarize it.`,
        data: { url, content: truncated }
      } as any;
    } catch (error: any) {
      return {
        action: 'CHAT',
        text: `Error scraping ${url}: ${error.message}`
      } as any;
    }
  }

  return { action: 'CHAT', text: 'Unknown tool called.' };
}

// =========================================================
// MAIN HANDLER
// =========================================================
export const handleSystemCommand = async (req: AuthRequest, res: Response) => {
  const { message, history = [] } = req.body;
  const userId = req.user?.id;

  if (!message) {
    return res.status(400).json({ message: 'Message is required' });
  }

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const cleanMessage = xss(message);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-12).map((h: any) => ({ role: h.role, content: xss(h.content) })),
    { role: 'user', content: cleanMessage }
  ];

  try {
    const aiResponse = await generateCompletion(messages, SYSTEM_TOOLS, 'auto');
    const data = (await aiResponse.json()) as any;
    const choice = data.choices?.[0];

    if (!choice) throw new Error('No response from AI');

    const assistantMessage = choice.message;

    // AI decided to call a tool
    if (choice.finish_reason === 'tool_calls' && assistantMessage.tool_calls?.length) {
      const toolCall = assistantMessage.tool_calls[0];
      const fn = toolCall.function;

      let args: any;
      try {
        args = JSON.parse(fn.arguments || '{}');
      } catch {
        args = {};
      }

      const result = await executeTool(fn.name, args, userId);

      // If it was just a context-fetch tool, we want the AI to continue the conversation with that data
      if (fn.name === 'get_system_registry') {
        const nextMessages = [
          ...messages,
          assistantMessage,
          {
            tool_call_id: toolCall.id,
            role: 'tool',
            name: fn.name,
            content: JSON.stringify(result.data)
          }
        ];
        const nextAiResponse = await generateCompletion(nextMessages, SYSTEM_TOOLS, 'auto');
        const nextData = (await nextAiResponse.json()) as any;
        const nextChoice = nextData.choices?.[0];
        if (nextChoice) {
          if (nextChoice.message.tool_calls) {
            const secondToolCall = nextChoice.message.tool_calls[0];
            const secondResult = await executeTool(secondToolCall.function.name, JSON.parse(secondToolCall.function.arguments || '{}'), userId);
            return res.json(secondResult);
          }
          return res.json({ action: 'CHAT', text: nextChoice.message.content.replace(/^\[(?:ES|EN)\]\s*/i, '') });
        }
      }

      // If it was a scraping tool, we ALSO want the AI to summarize it
      if (fn.name === 'scrape_url') {
        const nextMessages = [
          ...messages,
          assistantMessage,
          {
            tool_call_id: toolCall.id,
            role: 'tool',
            name: fn.name,
            content: JSON.stringify(result.data)
          }
        ];
        // Tell the AI to summarize specifically
        nextMessages.push({
          role: 'user',
          content: 'Please summarize the content found in the page.'
        } as any);

        const nextAiResponse = await generateCompletion(nextMessages, SYSTEM_TOOLS, 'auto');
        const nextData = (await nextAiResponse.json()) as any;
        const nextChoice = nextData.choices?.[0];
        if (nextChoice) {
          return res.json({ action: 'CHAT', text: nextChoice.message.content.replace(/^\[(?:ES|EN)\]\s*/i, '') });
        }
      }

      return res.json(result);
    }

    // Pure conversational response
    const text = assistantMessage?.content?.replace(/^\[(?:ES|EN)\]\s*/i, '') || 'I am here to help!';
    res.json({ action: 'CHAT', text });

  } catch (error: any) {
    console.error('System Bot error:', error.message);
    res.status(500).json({ message: 'Error processing your request', error: error.message });
  }
};