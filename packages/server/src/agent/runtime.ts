import { ChronokairosClient, resolveProvider } from '@chronokairo/sdk'
import { ToolRegistry, type ToolContext } from './tool-registry.js'
import { buildSystemPrompt } from './system-prompt.js'
import { loadMcpTools } from './mcp.js'

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }

type Message = {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

export type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string }
  | { type: 'error'; content: string }
  | { type: 'done'; metadata?: Record<string, unknown> }
  | { type: 'status'; content: string }

export type AgentEventCallback = (event: AgentEvent) => void | Promise<void>

export type ToolExecutor = (toolUseId: string, name: string, input: Record<string, unknown>) => Promise<{ content: string; isError?: boolean }>

export class AgentRuntime {
  private registry = new ToolRegistry()
  private history: Message[] = []
  private systemPrompt = ''

  constructor(private config: { workDir: string; provider: string; model: string }) {
    for (const tool of [
      { schema: { name: 'bash', description: 'Execute a bash command', input_schema: { type: 'object', properties: { command: { type: 'string' }, timeout: { type: 'number' } }, required: ['command'] } }, handler: async () => '' },
      { schema: { name: 'read', description: 'Read a file', input_schema: { type: 'object', properties: { file_path: { type: 'string' } }, required: ['file_path'] } }, handler: async () => '' },
      { schema: { name: 'write', description: 'Write a file', input_schema: { type: 'object', properties: { file_path: { type: 'string' }, content: { type: 'string' } }, required: ['file_path', 'content'] } }, handler: async () => '' },
      { schema: { name: 'glob', description: 'Search files by glob pattern', input_schema: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] } }, handler: async () => '' },
      { schema: { name: 'grep', description: 'Search file contents with regex', input_schema: { type: 'object', properties: { pattern: { type: 'string' }, include: { type: 'string' } }, required: ['pattern'] } }, handler: async () => '' },
    ]) {
      this.registry.register(tool)
    }
  }

  async init(skillsDirs?: string[], mcpJsonPath?: string) {
    if (mcpJsonPath) await loadMcpTools(mcpJsonPath, this.registry)
    this.systemPrompt = await buildSystemPrompt({
      tools: this.registry.listSchemas(),
      workDir: this.config.workDir,
      skillsDirs,
    })
  }

  getSystemPrompt() { return this.systemPrompt }
  getToolSchemas() { return this.registry.listSchemas() }
  getHistory() { return this.history }

  private buildApiMessages() {
    return this.history.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : m.content.map(c => {
        if (c.type === 'tool_use') return { type: 'tool_use' as const, id: c.id, name: c.name, input: c.input }
        return { type: 'text' as const, text: c.text }
      }),
    })) as any
  }

  async callLlm() {
    const provider = this.resolveProvider()
    const client = new ChronokairosClient({
      baseURL: provider.baseURL,
      apiKey: provider.apiKey,
      authToken: provider.authToken,
    })

    return client.beta.messages.create({
      model: provider.model || 'default',
      max_tokens: 4096,
      system: [{ type: 'text' as const, text: this.systemPrompt }],
      messages: this.buildApiMessages(),
      tools: this.registry.listSchemas().map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      })),
      stream: true,
    })
  }

  pushHistory(msg: Message) { this.history.push(msg) }

  private resolveProvider() {
    return resolveProvider(this.config.provider, { model: this.config.model || undefined })
  }
}
