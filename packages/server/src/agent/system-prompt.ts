import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ToolSchema } from './tool-registry.js'

export async function buildSystemPrompt(opts: {
  tools: ToolSchema[]
  workDir: string
  skillsDirs?: string[]
  extraInstructions?: string
}): Promise<string> {
  const parts: string[] = [
    `You are Kairos, an AI coding agent. You work in the workspace at ${opts.workDir}.`,
    '',
    'You have the following tools available. When you need to accomplish a task,',
    'call the appropriate tool with the correct parameters. The tool result will be returned to you.',
    '',
    'IMPORTANT: Read files before editing them. Run commands to verify your changes.',
    'When you encounter an error, read the error message and fix it.',
    '',
    'Available tools:',
    ...opts.tools.map(t => formatToolSchema(t)),
  ]

  // Load skills from SKILL.md files
  if (opts.skillsDirs) {
    for (const dir of opts.skillsDirs) {
      const skill = await loadSkill(dir)
      if (skill) {
        parts.push('', `--- Skill: ${skill.name} ---`, '', skill.content)
      }
    }
  }

  if (opts.extraInstructions) {
    parts.push('', opts.extraInstructions)
  }

  return parts.join('\n')
}

function formatToolSchema(t: ToolSchema): string {
  const props = t.input_schema?.properties as Record<string, any> | undefined
  const required = (t.input_schema?.required as string[]) || []
  const lines = [`- ${t.name}: ${t.description}`]
  if (props) {
    for (const [key, val] of Object.entries(props)) {
      const req = required.includes(key) ? ' (required)' : ''
      lines.push(`    ${key}${req}: ${val.description || val.type}`)
    }
  }
  return lines.join('\n')
}

async function loadSkill(dir: string): Promise<{ name: string; content: string } | null> {
  try {
    const content = await readFile(join(dir, 'SKILL.md'), 'utf-8')
    const name = dir.split('/').pop() || 'unnamed'
    return { name, content }
  } catch {
    return null
  }
}
