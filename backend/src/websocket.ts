import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { spawnPiper } from './services/voiceService';
import { generateCompletion } from './services/aiService';
import { executeSkill, OrchestratorContext } from './services/orchestratorService';
import { query } from './utils/db';
import { fetchMcpTools, executeMcpTool, McpServerConfig } from './services/mcpService';
import { SYSTEM_TOOLS, SYSTEM_PROMPT, executeTool } from './controllers/systemController';

export const initializeWebSocket = (server: Server) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] Client connected for voice chat');
    
    // Maintain state for this connection
    const state: { ttsProcess: any, currentLang: 'es' | 'en' } = {
        ttsProcess: null,
        currentLang: 'es'
    };

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'init') {
            state.currentLang = data.lang || 'es';
            // Start piper process
            state.ttsProcess = spawnPiper(state.currentLang);
            state.ttsProcess.stdout.on('data', (audioChunk: Buffer) => {
                // Send raw PCM to client
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(audioChunk);
                }
            });
            state.ttsProcess.on('error', (err: any) => console.error('[Piper Error]', err));
        }
        else if (data.type === 'text') {
            const userText = data.text;
            const targetType = data.targetType; // 'agent' or 'system'
            const targetId = data.targetId; // agentId if agent
            const userId = data.userId;
            const history = data.history || [];

            console.log(`[WebSocket] Received text for ${targetType}: ${userText}`);

            await processConversationStream({
                ws,
                state,
                userText,
                targetType,
                targetId,
                userId,
                history
            });
        }
      } catch (err) {
        console.error('[WebSocket] Message error:', err);
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
      if (state.ttsProcess) {
        state.ttsProcess.kill();
      }
    });
  });

  console.log('[WebSocket] Server attached to HTTP server');
};

async function processConversationStream({ ws, state, userText, targetType, targetId, userId, history }: any) {
  let allAvailableTools: any[] = [];
  let messages: any[] = [];

  // Limit history to last 6 messages (3 complete turns) for max speed and sufficient memory
  const shortHistory = history.slice(-6);

  const langLabel = state.currentLang === 'es' ? 'Spanish' : 'English';
  const voiceInstructions = `
IMPORTANT RULES FOR VOICE MODE:
1. The user's language is ${langLabel}. You MUST respond in ${langLabel} at all times.
2. Start your final conversational response with ${state.currentLang === 'es' ? '[ES]' : '[EN]'}.
3. Keep your conversational responses very brief, direct, and conversational (1-3 sentences).
4. If executing a tool, rely on the recent conversation history for context.
5. BE DECISIVE: If the user provides a partial name or system prompt for an agent/skill, DO NOT ask for more details. Just infer the missing parts, generate a complete professional system prompt automatically, and call request_confirmation IMMEDIATELY.
6. When generating tool arguments like system_prompt, write them in ${langLabel} as well.
`;

  try {
    if (targetType === 'system') {
        messages = [
            { role: 'system', content: SYSTEM_PROMPT + voiceInstructions },
            ...shortHistory,
            { role: 'user', content: userText }
        ];
        allAvailableTools = SYSTEM_TOOLS;
    } else {
        // Agent logic
        const agentRes = await query('SELECT * FROM agents WHERE id = $1 AND user_id = $2', [targetId, userId]);
        const agent = agentRes.rows[0];
        if (!agent) throw new Error('Agent not found');

        const skillsRes = await query('SELECT * FROM skills WHERE user_id = $1', [userId]);
        const internalSkills = skillsRes.rows.map(s => ({
            type: 'function',
            function: { name: s.name, description: s.description, parameters: s.parameters_schema }
        }));

        allAvailableTools = [...internalSkills];
        
        messages = [
            { role: 'system', content: agent.system_prompt + '\n' + voiceInstructions },
            ...shortHistory,
            { role: 'user', content: userText }
        ];
    }

    // Call LLM with streaming
    const maxTurns = 3;
    let turns = 0;
    
    while (turns < maxTurns) {
        // STREAMING = true
        const response = await generateCompletion(messages, allAvailableTools.length > 0 ? allAvailableTools : undefined, 'auto', true);
        
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No stream available');

        try {
            const decoder = new TextDecoder('utf-8');

            let fullText = '';
            let sentenceBuffer = '';
            let detectedLang = state.currentLang;
            let toolCallsRaw: any = {}; 
            let isToolCall = false;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunkStr = decoder.decode(value, { stream: true });
                const lines = chunkStr.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const delta = data.choices[0]?.delta;
                            
                            if (delta?.tool_calls) {
                                isToolCall = true;
                                // Accumulate tool calls
                                for (const tc of delta.tool_calls) {
                                    if (!toolCallsRaw[tc.index]) toolCallsRaw[tc.index] = { id: tc.id, type: 'function', function: { name: '', arguments: '' } };
                                    if (tc.id) toolCallsRaw[tc.index].id = tc.id;
                                    if (tc.function?.name) toolCallsRaw[tc.index].function.name += tc.function.name;
                                    if (tc.function?.arguments) toolCallsRaw[tc.index].function.arguments += tc.function.arguments;
                                }
                            } else if (delta?.content) {
                                fullText += delta.content;
                                sentenceBuffer += delta.content;
                                
                                // Remove language tags from the buffer seamlessly
                                let cleanBuffer = sentenceBuffer.replace(/^\[(?:ES|EN)\]\s*/i, '');
                                
                                // Tag detection based on the very start of fullText
                                if (fullText.startsWith('[ES]')) detectedLang = 'es';
                                else if (fullText.startsWith('[EN]')) detectedLang = 'en';
                                
                                // Stream to piper by sentence
                                const match = cleanBuffer.match(/([^.!?\n]+[.!?\n]+)(.*)/);
                                if (match) {
                                    const sentence = match[1];
                                    sentenceBuffer = match[2]; // keep the rest
                                    
                                    if (!state.ttsProcess || detectedLang !== state.currentLang) {
                                        if (state.ttsProcess) state.ttsProcess.kill();
                                        state.currentLang = detectedLang;
                                        state.ttsProcess = spawnPiper(state.currentLang);
                                        state.ttsProcess.stdout.on('data', (c: Buffer) => { if (ws.readyState === 1) ws.send(c); });
                                        state.ttsProcess.on('error', (err: any) => console.error('[Piper Error]', err));
                                    }

                                    if (state.ttsProcess) {
                                        const cleanSentenceForVoice = sentence.replace(/[*_`#]/g, '').trim();
                                        if (cleanSentenceForVoice) {
                                            state.ttsProcess.stdin.write(cleanSentenceForVoice + "\n");
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            // ignore JSON parse errors on partial chunks
                        }
                    }
                }
            }

            // End of stream handling
            if (isToolCall) {
                const tool_calls = Object.values(toolCallsRaw);
                messages.push({ role: 'assistant', tool_calls });
                for (const toolCall of tool_calls as any[]) {
                    const functionName = toolCall.function.name;
                    let functionArgs = {};
                    try {
                        functionArgs = JSON.parse(toolCall.function.arguments || '{}');
                    } catch (err) {
                        console.error('[Tool Parse Error] Invalid JSON from LLM:', toolCall.function.arguments);
                        // Add a tool-role error response to keep the message sequence valid (assistant → tool)
                        messages.push({
                            tool_call_id: toolCall.id,
                            role: 'tool',
                            name: functionName,
                            content: 'Error: Failed to parse tool arguments. The JSON was malformed.'
                        });
                        ws.send(JSON.stringify({ type: 'reply', text: state.currentLang === 'es' ? 'Hubo un error procesando tu solicitud, intentando de nuevo...' : 'There was an error processing your request, retrying...', role: 'assistant' }));
                        continue;
                    }
                    
                    let resultText = '';
                    if (targetType === 'system') {
                        const result = await executeTool(functionName, functionArgs, userId);
                        resultText = JSON.stringify(result.data || result);
                        // Tell client to update UI
                        ws.send(JSON.stringify({ type: 'action', action: result.action, target: result.target }));
                    } else {
                        try {
                            const result = await executeSkill(functionName, functionArgs, userId);
                            resultText = typeof result === 'string' ? result : JSON.stringify(result);
                        } catch (e: any) {
                            resultText = `Skill execution failed: ${e.message}`;
                        }
                    }

                    messages.push({
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        name: functionName,
                        content: resultText
                    });
                }
                turns++;
            } else {
                // Flush remaining buffer
                let cleanBuffer = sentenceBuffer.replace(/^\[(?:ES|EN)\]\s*/i, '');
                if (cleanBuffer.trim()) {
                    if (!state.ttsProcess || detectedLang !== state.currentLang) {
                         if (state.ttsProcess) state.ttsProcess.kill();
                         state.currentLang = detectedLang;
                         state.ttsProcess = spawnPiper(state.currentLang);
                         state.ttsProcess.stdout.on('data', (c: Buffer) => { if (ws.readyState === 1) ws.send(c); });
                         state.ttsProcess.on('error', (err: any) => console.error('[Piper Error]', err));
                    }
                    if (state.ttsProcess) {
                        const finalCleanBuffer = cleanBuffer.replace(/[*_`#]/g, '').trim();
                        if (finalCleanBuffer) {
                            state.ttsProcess.stdin.write(finalCleanBuffer + "\n");
                        }
                    }
                }
                
                messages.push({ role: 'assistant', content: fullText });
                const textToSpeak = fullText.replace(/^\[(?:ES|EN)\]\s*/i, '').trim();
                ws.send(JSON.stringify({ type: 'reply', text: textToSpeak, role: 'assistant' }));
                break;
            }
        } finally {
            // Garantizar la liberación del lector y cancelación del cuerpo del stream para cerrar el socket TCP subyacente
            try {
                reader.releaseLock();
                await response.body?.cancel();
            } catch (err) {
                // Ignorar fallos de cierre de stream ya cancelados
            }
        }
    }
  } catch (error: any) {
    console.error('Streaming error:', error);
    ws.send(JSON.stringify({ type: 'error', message: error.message }));
  }
}
