export type ToolSchema = {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export type ToolHandler = (input: Record<string, unknown>, context: ToolContext) => Promise<string>

export type ToolContext = {
  sessionId: string
  workDir: string
  env: Record<string, string>
}

export interface Tool {
  schema: ToolSchema
  handler: ToolHandler
}

export class ToolRegistry {
  private tools = new Map<string, Tool>()

  register(tool: Tool) {
    this.tools.set(tool.schema.name, tool)
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  listSchemas(): ToolSchema[] {
    return Array.from(this.tools.values()).map(t => t.schema)
  }

  async execute(name: string, input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`Unknown tool: ${name}`)
    return tool.handler(input, ctx)
  }
}
