// Layer 8: Agent Registry + persistent memory
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { loadConfig } from './config.js'

export type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'

export interface AgentEntry {
  id: string
  name: string
  description: string
  systemPrompt?: string
  defaultModel?: string
  defaultProvider?: string
  tools?: string[]           // allowed tool names
  ownerId: string
  orgId?: string
  tags: string[]
  createdAt: number
  updatedAt: number
  runCount: number
  avgLatencyMs?: number
  successRate?: number
}

export interface AgentRunRecord {
  id: string
  agentId: string
  sessionId?: string
  userId: string
  status: AgentStatus
  startedAt: number
  endedAt?: number
  inputSummary: string
  outputSummary?: string
  tokensUsed?: number
  cost?: number
  error?: string
}

// In-process memory store (production would use Firestore/Redis)
export interface AgentMemory {
  agentId: string
  userId: string
  entries: MemoryEntry[]
  updatedAt: number
}

export interface MemoryEntry {
  id: string
  content: string
  type: 'fact' | 'preference' | 'instruction' | 'context'
  timestamp: number
  ttl?: number   // expire after N ms
}

let _agentRegistry: Map<string, AgentEntry> | null = null
const _memoryStore = new Map<string, AgentMemory>()
const _runHistory: AgentRunRecord[] = []

async function getAgentRegistry(): Promise<Map<string, AgentEntry>> {
  if (_agentRegistry) return _agentRegistry
  _agentRegistry = new Map()
  try {
    const config = loadConfig()
    const raw = await readFile(join(config.workspace, '.kairos', 'agent-registry.json'), 'utf-8')
    const arr: AgentEntry[] = JSON.parse(raw)
    for (const a of arr) _agentRegistry.set(a.id, a)
  } catch { /* empty */ }
  return _agentRegistry
}

async function saveAgentRegistry(): Promise<void> {
  const reg = await getAgentRegistry()
  try {
    const config = loadConfig()
    const dir = join(config.workspace, '.kairos')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'agent-registry.json'), JSON.stringify([...reg.values()], null, 2))
  } catch { /* best-effort */ }
}

export async function registerAgent(opts: Omit<AgentEntry, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>): Promise<AgentEntry> {
  const reg = await getAgentRegistry()
  const id = `agent_${crypto.randomUUID().slice(0, 8)}`
  const now = Date.now()
  const entry: AgentEntry = { ...opts, id, createdAt: now, updatedAt: now, runCount: 0 }
  reg.set(id, entry)
  await saveAgentRegistry()
  return entry
}

export async function getAgent(id: string): Promise<AgentEntry | null> {
  const reg = await getAgentRegistry()
  return reg.get(id) ?? null
}

export async function listAgents(userId?: string, orgId?: string): Promise<AgentEntry[]> {
  const reg = await getAgentRegistry()
  return [...reg.values()].filter(a => {
    if (!userId && !orgId) return true
    if (a.ownerId === userId) return true
    if (orgId && a.orgId === orgId) return true
    return false
  })
}

export function recordAgentRun(run: Omit<AgentRunRecord, 'id'>): void {
  _runHistory.push({ ...run, id: crypto.randomUUID() })
  if (_runHistory.length > 50_000) _runHistory.shift()
}

// ─── Persistent agent memory ──────────────────────────────────────────────────

export function getAgentMemory(agentId: string, userId: string): AgentMemory {
  const key = `${agentId}:${userId}`
  return _memoryStore.get(key) ?? { agentId, userId, entries: [], updatedAt: Date.now() }
}

export function addMemoryEntry(agentId: string, userId: string, entry: Omit<MemoryEntry, 'id' | 'timestamp'>): MemoryEntry {
  const key = `${agentId}:${userId}`
  const mem = getAgentMemory(agentId, userId)
  const full: MemoryEntry = { ...entry, id: crypto.randomUUID(), timestamp: Date.now() }
  // Remove expired
  const now = Date.now()
  mem.entries = mem.entries.filter(e => !e.ttl || (e.timestamp + e.ttl) > now)
  mem.entries.push(full)
  mem.updatedAt = Date.now()
  _memoryStore.set(key, mem)
  return full
}

export function searchMemory(agentId: string, userId: string, query: string): MemoryEntry[] {
  const mem = getAgentMemory(agentId, userId)
  const lq = query.toLowerCase()
  return mem.entries.filter(e => e.content.toLowerCase().includes(lq))
}
