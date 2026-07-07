import { execSync } from 'node:child_process'
import type { Tool, ToolContext } from '../tool-registry.js'

export const bashTool: Tool = {
  schema: {
    name: 'bash',
    description: 'Execute a bash command in the session workspace. Returns stdout + stderr.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The bash command to execute' },
        timeout: { type: 'number', description: 'Timeout in milliseconds (default 30000)', default: 30000 },
      },
      required: ['command'],
    },
  },
  handler: async (input: Record<string, unknown>, ctx: ToolContext) => {
    const command = String(input.command)
    const timeout = (input.timeout as number) || 30000
    try {
      const output = execSync(command, { cwd: ctx.workDir, timeout, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
      return output || '(no output)'
    } catch (err: any) {
      if (err.stdout) return err.stdout + (err.stderr ? '\n' + err.stderr : '')
      return `Error: ${err.message}`
    }
  },
}
