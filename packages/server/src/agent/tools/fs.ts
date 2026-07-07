import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { glob } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import type { Tool, ToolContext } from '../tool-registry.js'

export const readTool: Tool = {
  schema: {
    name: 'read',
    description: 'Read a file from the workspace. Returns the full content.',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path relative to workspace root' },
      },
      required: ['file_path'],
    },
  },
  handler: async (input: Record<string, unknown>, ctx: ToolContext) => {
    const filePath = String(input.file_path)
    const absPath = join(ctx.workDir, filePath)
    if (!absPath.startsWith(ctx.workDir)) return 'Error: path outside workspace'
    try {
      const content = await readFile(absPath, 'utf-8')
      return content
    } catch (err: any) {
      return `Error: ${err.message}`
    }
  },
}

export const writeTool: Tool = {
  schema: {
    name: 'write',
    description: 'Write content to a file in the workspace. Creates directories if needed.',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path relative to workspace root' },
        content: { type: 'string', description: 'File content' },
      },
      required: ['file_path', 'content'],
    },
  },
  handler: async (input: Record<string, unknown>, ctx: ToolContext) => {
    const filePath = String(input.file_path)
    const content = String(input.content)
    const absPath = join(ctx.workDir, filePath)
    if (!absPath.startsWith(ctx.workDir)) return 'Error: path outside workspace'
    try {
      await mkdir(new URL('.', absPath).pathname, { recursive: true })
      await writeFile(absPath, content, 'utf-8')
      return `Written ${content.length} bytes to ${filePath}`
    } catch (err: any) {
      return `Error: ${err.message}`
    }
  },
}

export const globTool: Tool = {
  schema: {
    name: 'glob',
    description: 'Search for files matching a glob pattern in the workspace.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern (e.g. **/*.ts)' },
      },
      required: ['pattern'],
    },
  },
  handler: async (input: Record<string, unknown>, ctx: ToolContext) => {
    const pattern = String(input.pattern)
    try {
      const results: string[] = []
      for await (const entry of glob(pattern, { cwd: ctx.workDir })) {
        results.push(entry)
      }
      return results.length > 0 ? results.join('\n') : '(no matches)'
    } catch (err: any) {
      return `Error: ${err.message}`
    }
  },
}
