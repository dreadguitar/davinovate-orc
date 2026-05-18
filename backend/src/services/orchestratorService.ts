import { query } from '../utils/db';
import { generateEmbedding, generateCompletion } from './aiService';
import vm from 'vm';
import { fetchMcpTools, executeMcpTool, McpServerConfig } from './mcpService';

export interface OrchestratorContext {
  userId: string;
  agentId: string;
  conversationId?: string;
}

export const orchestrate = async (message: string, context: OrchestratorContext) => {
  const { userId, agentId } = context;

  // 1. Retrieve Agent details
  const agentRes = await query('SELECT * FROM agents WHERE id = $1 AND user_id = $2', [agentId, userId]);
  const agent = agentRes.rows[0];
  if (!agent) throw new Error('Agent not found');

  // 2. RAG: Search Knowledge Base
  const embedding = await generateEmbedding(message);
  let relevantContext = '';

  if (embedding) {
    const vectorStr = `[${embedding.join(',')}]`;
    
    const knowledgeRes = await query(
      `SELECT content_text, 1 - (embedding <=> $1) as similarity 
       FROM knowledge 
       WHERE user_id = $2 AND (agent_id = $3 OR agent_id IS NULL)
       ORDER BY similarity DESC 
       LIMIT 3`,
      [vectorStr, userId, agentId]
    );
    
    relevantContext = knowledgeRes.rows
      .filter(row => row.similarity > 0.7)
      .map(row => row.content_text)
      .join('\n\n');
  }

  // 3. Skills: Retrieve available skills for the user
  const skillsRes = await query('SELECT * FROM skills WHERE user_id = $1', [userId]);
  const internalSkills = skillsRes.rows.map(s => ({
    type: 'function',
    function: {
      name: s.name,
      description: s.description,
      parameters: s.parameters_schema
    }
  }));

  // 3.5 External MCP Skills
  const mcpServers: McpServerConfig[] = agent.mcp_config || [];
  const mcpSkills: any[] = [];
  const mcpToolMap = new Map<string, McpServerConfig>();

  for (const server of mcpServers) {
    const tools = await fetchMcpTools(server);
    for (const tool of tools) {
      // Avoid name collisions by prefixing or keeping a map
      const uniqueName = `mcp_${server.name}_${tool.name}`;
      mcpSkills.push({
        type: 'function',
        function: {
          name: uniqueName,
          description: tool.description,
          parameters: tool.parameters
        }
      });
      mcpToolMap.set(uniqueName, { ...server, toolOriginalName: tool.name } as any);
    }
  }

  const allAvailableTools = [...internalSkills, ...mcpSkills];

  // 4. Construct Initial Message History
  const finalSystemPrompt = `
    ${agent.system_prompt}
    
    MANAGED CONTEXT FROM KNOWLEDGE BASE:
    ${relevantContext || 'No specific knowledge found for this query.'}
    
    INSTRUCTIONS:
    - Use the provided context to answer questions accurately.
    - Use available skills if necessary to fulfill the request.
    - Be precise and helpful.
  `;

  let messages: any[] = [
    { role: 'system', content: finalSystemPrompt },
    { role: 'user', content: message }
  ];

  // 5. Orchestration Loop (Max 5 turns)
  let turns = 0;
  const maxTurns = 5;

  while (turns < maxTurns) {
    const response = await generateCompletion(messages, allAvailableTools.length > 0 ? allAvailableTools : undefined);
    const data = (await response.json()) as any;
    const choice = data.choices[0];
    const assistantMessage = choice.message;

    messages.push(assistantMessage);

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log(`[Turn ${turns + 1}] Executing ${assistantMessage.tool_calls.length} tool calls...`);
      
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        try {
          let result;
          if (mcpToolMap.has(functionName)) {
            const mcpInfo = mcpToolMap.get(functionName)! as any;
            console.log(`[Turn ${turns + 1}] Executing MCP tool: ${functionName} (${mcpInfo.toolOriginalName})`);
            result = await executeMcpTool(mcpInfo, mcpInfo.toolOriginalName, functionArgs);
          } else {
            console.log(`[Turn ${turns + 1}] Executing internal skill: ${functionName}`);
            result = await executeSkill(functionName, functionArgs, userId);
          }

          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(result)
          });
        } catch (error: any) {
          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: `Error: ${error.message}`
          });
        }
      }
      turns++;
    } else {
      // Final response reached
      if (assistantMessage.content) {
         assistantMessage.content = assistantMessage.content.replace(/^\[(?:ES|EN)\]\s*/i, '');
         data.choices[0].message.content = assistantMessage.content;
      }
      return { 
        data, 
        messages // Return full history if needed for conversation logging
      };
    }
  }

  throw new Error('Maximum orchestration turns reached');
};

export const executeSkill = async (skillName: string, args: any, userId: string) => {
  const skillRes = await query('SELECT * FROM skills WHERE name = $1 AND user_id = $2', [skillName, userId]);
  const skill = skillRes.rows[0];
  if (!skill) throw new Error(`Skill ${skillName} not found`);

  // Secure Sandbox using 'vm' module
  try {
    const sandbox = {
      params: args,
      fetch: fetch, // Allow HTTP calls for skills (search APIs, etc)
      console: {
        log: (...args: any[]) => console.log(`[Skill: ${skillName}]`, ...args),
        error: (...args: any[]) => console.error(`[Skill: ${skillName}]`, ...args),
      },
      setTimeout,
      clearTimeout,
      JSON,
      Math,
      Date
    };

    const context = vm.createContext(sandbox);

    // Provide a protected execution environment
    const script = new vm.Script(`
      (async () => {
        ${skill.action_code}
        return await perform(params);
      })()
    `);

    // Run but kill it if it hangs after 5 seconds to prevent DoS
    return await script.runInContext(context, { timeout: 5000 });
  } catch (error: any) {
    console.error('Skill execution failed:', error);
    throw new Error(`Execution error in skill ${skillName}: ${error.message}`);
  }
};
