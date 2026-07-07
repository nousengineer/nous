import { readFile, access } from 'node:fs/promises'
import type { ToolSchema, ToolRegistry, Tool } from './tool-registry.js'

type McpServerConfig = {
  command: string
  args?: string[]
  env?: Record<string, string>
  type?: 'stdio' | 'streamable-http'
  url?: string
}

type McpConfig = {
  mcpServers: Record<string, McpServerConfig>
}

// In relay mode the server only exposes MCP tool schemas to the LLM.
// Tool execution is delegated to the client via WebSocket.
// When the client sends a tool_result for an MCP tool, the server relays it back.
export async function loadMcpTools(configPath: string, registry: ToolRegistry): Promise<void> {
  try {
    await access(configPath)
  } catch {
    return
  }

  let content: string
  try {
    content = await readFile(configPath, 'utf-8')
  } catch {
    return
  }

  let config: McpConfig
  try {
    config = JSON.parse(content)
  } catch {
    return
  }

  if (!config.mcpServers) return

  for (const [serverName, serverCfg] of Object.entries(config.mcpServers)) {
    try {
      const tools = await discoverMcpTools(serverName, serverCfg)
      for (const tool of tools) {
        registry.register(tool)
      }
    } catch (err) {
      console.warn(`[mcp] failed to connect ${serverName}:`, err)
    }
  }
}

async function discoverMcpTools(name: string, cfg: McpServerConfig): Promise<Tool[]> {
  if (cfg.type === 'streamable-http' || cfg.url) {
    return discoverHttpMcpTools(name, cfg)
  }

  const { spawn } = await import('node:child_process')

  return new Promise((resolve, reject) => {
    const proc = spawn(cfg.command, cfg.args || [], {
      env: { ...process.env, ...cfg.env } as NodeJS.ProcessEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let buffer = ''
    const tools: Tool[] = []
    let settled = false

    const onData = (data: Buffer) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const msg = JSON.parse(line)
          if (msg.id === 'init' && msg.result) {
            // Send tools/list after initialization
            proc.stdin?.write(JSON.stringify({
              jsonrpc: '2.0',
              id: 'list-tools',
              method: 'tools/list',
              params: {},
            }) + '\n')
          } else if (msg.id === 'list-tools' && msg.result?.tools) {
            for (const t of msg.result.tools as any[]) {
              tools.push(makeMcpRelayTool(name, t))
            }
            settled = true
            cleanup()
            resolve(tools)
          }
        } catch { /* partial JSON */ }
      }
    }

    const onError = (err: Error) => {
      if (!settled) { settled = true; cleanup(); resolve([]) }
    }

    const onClose = () => {
      if (!settled) { settled = true; resolve(tools) }
    }

    const cleanup = () => {
      proc.stdout?.removeListener('data', onData)
      proc.stderr?.removeListener('data', onData)
      proc.removeListener('error', onError)
      proc.removeListener('close', onClose)
      setTimeout(() => { try { proc.kill() } catch {} }, 100)
    }

    proc.stdout?.on('data', onData)
    proc.stderr?.on('data', onData)
    proc.on('error', onError)
    proc.on('close', onClose)

    // Initialize
    proc.stdin?.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 'init',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'kairos-server', version: '0.2.0' },
      },
    }) + '\n')

    // Timeout
    setTimeout(() => {
      if (!settled) { settled = true; cleanup(); resolve(tools) }
    }, 5000)
  })
}

function makeMcpRelayTool(serverName: string, t: any): Tool {
  return {
    schema: {
      name: `mcp__${serverName}__${t.name}`,
      description: t.description || `MCP tool from ${serverName}`,
      input_schema: t.inputSchema || {},
    },
    handler: async (input, ctx) => {
      throw new Error('MCP tool execution is not available on the server. The client (CLI/IDE) must execute MCP tools and send results back.')
    },
  }
}

async function discoverHttpMcpTools(_name: string, _cfg: McpServerConfig): Promise<Tool[]> {
  console.warn(`[mcp] streamable-http not yet supported in server; skipping ${_name}`)
  return []
}
