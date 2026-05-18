export interface McpTool {
  name: string;
  description: string;
  parameters: any;
}

export interface McpServerConfig {
  name: string;
  url: string;
  apiKey?: string;
}

export const fetchMcpTools = async (server: McpServerConfig): Promise<McpTool[]> => {
  try {
    const response = await fetch(`${server.url}/tools`, {
      headers: server.apiKey ? { 'Authorization': `Bearer ${server.apiKey}` } : {}
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json() as any;
    return data.tools || [];
  } catch (error: any) {
    console.error(`Failed to fetch tools from MCP server ${server.name}:`, error.message);
    return [];
  }
};

export const executeMcpTool = async (server: McpServerConfig, toolName: string, args: any): Promise<any> => {
  try {
    const response = await fetch(`${server.url}/tools/${toolName}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(server.apiKey ? { 'Authorization': `Bearer ${server.apiKey}` } : {})
      },
      body: JSON.stringify(args)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error: any) {
    console.error(`Failed to execute MCP tool ${toolName} on server ${server.name}:`, error.message);
    throw new Error(`MCP tool execution failed: ${error.message}`);
  }
};
