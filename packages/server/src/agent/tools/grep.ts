import { execSync } from 'node:child_process'
import type { Tool, ToolContext } from '../tool-registry.js'

export const grepTool: Tool = {
  schema: {
    name: 'grep',
    description: 'Search file contents using regex. Uses ripgrep if available, otherwise grep.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regex pattern to search for' },
        include: { type: 'string', description: 'File glob to include (e.g. *.ts)' },
        path: { type: 'string', description: 'Subdirectory to search (relative to workspace)' },
      },
      required: ['pattern'],
    },
  },
  handler: async (input: Record<string, unknown>, ctx: ToolContext) => {
    const pattern = String(input.pattern)
    const include = input.include ? String(input.include) : ''
    const searchPath = input.path ? String(input.path) : '.'
    const absPath = ctx.workDir

    try {
      const cmd = `rg --line-number --color=never ${include ? `--glob '${include}'` : ''} -e ${JSON.stringify(pattern)} ${searchPath}`
      const output = execSync(cmd, { cwd: absPath, encoding: 'utf-8', timeout: 15000, maxBuffer: 5 * 1024 * 1024 })
      return output || '(no matches)'
    } catch (err: any) {
      if (err.status === 1) return '(no matches)'
      return `Error: ${err.message}`
    }
  },
}
