// Layer 7: MCP Registry — persistent catalog of MCP servers + tools
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { loadConfig } from '../config.js'

export interface McpServerEntry {
  id: string
  name: string
  description: string
  command?: string
  args?: string[]
  url?: string                // For HTTP-based servers
  type: 'stdio' | 'http' | 'streamable-http'
  tools: McpToolEntry[]
  ownerId: string
  orgId?: string
  enabled: boolean
  permissions: McpPermission[]
  billingRate?: number        // USD per tool call
  createdAt: number
  lastDiscoveredAt?: number
}

export interface McpToolEntry {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  callCount: number
  lastCalledAt?: number
  avgLatencyMs?: number
  billingRate?: number
}

export interface McpPermission {
  principal: 'user' | 'role' | 'org'
  id: string                  // userId, roleName, or orgId
  allowedTools?: string[]     // undefined = all tools
  denyTools?: string[]
  rateLimit?: number          // calls per minute
}

export interface McpCallTrace {
  id: string
  serverId: string
  toolName: string
  userId?: string
  requestId: string
  inputSummary: string
  outputSummary: string
  latencyMs: number
  success: boolean
  cost?: number
  timestamp: number
}

let _registry: Map<string, McpServerEntry> | null = null
const _traces: McpCallTrace[] = []

async function getRegistry(): Promise<Map<string, McpServerEntry>> {
  if (_registry) return _registry
  _registry = new Map()
  try {
    const config = loadConfig()
    const raw = await readFile(join(config.workspace, '.kairos', 'mcp-registry.json'), 'utf-8')
    const arr: McpServerEntry[] = JSON.parse(raw)
    for (const s of arr) _registry.set(s.id, s)
  } catch { /* empty */ }
  return _registry
}

async function saveRegistry(): Promise<void> {
  const reg = await getRegistry()
  try {
    const config = loadConfig()
    const dir = join(config.workspace, '.kairos')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'mcp-registry.json'), JSON.stringify([...reg.values()], null, 2))
  } catch { /* best-effort */ }
}

export async function registerMcpServer(opts: Omit<McpServerEntry, 'id' | 'createdAt' | 'tools'>): Promise<McpServerEntry> {
  const reg = await getRegistry()
  const id = `mcp_${crypto.randomUUID().slice(0, 8)}`
  const entry: McpServerEntry = { ...opts, id, tools: [], createdAt: Date.now() }
  reg.set(id, entry)
  await saveRegistry()
  return entry
}

export async function getMcpServer(id: string): Promise<McpServerEntry | null> {
  const reg = await getRegistry()
  return reg.get(id) ?? null
}

export async function listMcpServers(userId?: string, orgId?: string): Promise<McpServerEntry[]> {
  const reg = await getRegistry()
  return [...reg.values()].filter(s => {
    if (s.ownerId === userId) return true
    if (orgId && s.orgId === orgId) return true
    return false
  })
}

export async function updateMcpServerTools(id: string, tools: McpToolEntry[]): Promise<void> {
  const reg = await getRegistry()
  const server = reg.get(id)
  if (server) { server.tools = tools; server.lastDiscoveredAt = Date.now(); await saveRegistry() }
}

export async function checkMcpPermission(serverId: string, toolName: string, userId: string, orgId?: string): Promise<boolean> {
  const reg = await getRegistry()
  const server = reg.get(serverId)
  if (!server || !server.enabled) return false

  for (const perm of server.permissions) {
    const matches =
      (perm.principal === 'user' && perm.id === userId) ||
      (perm.principal === 'org' && perm.id === (orgId ?? ''))

    if (!matches) continue
    if (perm.denyTools?.includes(toolName)) return false
    if (perm.allowedTools && !perm.allowedTools.includes(toolName)) return false
    return true
  }

  // No matching permission = deny by default
  return false
}

export function traceMcpCall(trace: Omit<McpCallTrace, 'id' | 'timestamp'>): void {
  _traces.push({ ...trace, id: crypto.randomUUID(), timestamp: Date.now() })
  if (_traces.length > 10_000) _traces.shift()
}

export function getMcpTraces(opts: { serverId?: string; userId?: string; since?: number } = {}): McpCallTrace[] {
  let traces = _traces
  if (opts.serverId) traces = traces.filter(t => t.serverId === opts.serverId)
  if (opts.userId) traces = traces.filter(t => t.userId === opts.userId)
  if (opts.since) traces = traces.filter(t => t.timestamp >= opts.since!)
  return traces
}
