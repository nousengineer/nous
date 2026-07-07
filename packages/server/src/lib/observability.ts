// Layer 3: Observability — request logs, traces, analytics, FinOps
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { loadConfig } from './config.js'

export interface RequestLogEntry {
  requestId: string
  timestamp: number
  userId?: string
  orgId?: string
  format: 'openai' | 'anthropic' | 'native' | 'gemini'
  provider?: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  latencyMs?: number
  cost?: number            // USD
  cached?: boolean
  blocked?: boolean
  blockReason?: string
  startedAt: number
  body?: Record<string, unknown>
  response?: unknown
  error?: string
}

export interface UsageSummary {
  requests: number
  inputTokens: number
  outputTokens: number
  totalCost: number
  avgLatencyMs: number
  errorRate: number
}

// In-memory analytics (survives requests via module scope)
const _requestLog: RequestLogEntry[] = []

let _logDir: string | null = null
function getLogDir(): string {
  if (!_logDir) {
    const config = loadConfig()
    _logDir = join(config.workspace, '.kairos', 'gateway-logs')
  }
  return _logDir
}

export async function logRequest(entry: Omit<RequestLogEntry, 'timestamp'>): Promise<void> {
  const full: RequestLogEntry = { ...entry, timestamp: Date.now() }

  // Compute cost if we have token counts
  if (full.inputTokens || full.outputTokens) {
    full.cost = estimateCost(full.model ?? '', full.inputTokens ?? 0, full.outputTokens ?? 0)
  }

  _requestLog.push(full)
  if (_requestLog.length > 10_000) _requestLog.shift()

  // Persist to JSONL
  try {
    const dir = getLogDir()
    await mkdir(dir, { recursive: true })
    const date = new Date().toISOString().slice(0, 10)
    await appendFile(join(dir, `requests-${date}.jsonl`), JSON.stringify(full) + '\n')
  } catch { /* best-effort */ }
}

export function getAnalytics(opts: {
  userId?: string
  orgId?: string
  since?: number
  model?: string
  provider?: string
}): UsageSummary {
  let entries = _requestLog
  if (opts.userId) entries = entries.filter(e => e.userId === opts.userId)
  if (opts.orgId) entries = entries.filter(e => e.orgId === opts.orgId)
  if (opts.since) entries = entries.filter(e => e.timestamp >= opts.since!)
  if (opts.model) entries = entries.filter(e => e.model === opts.model)
  if (opts.provider) entries = entries.filter(e => e.provider === opts.provider)

  const requests = entries.length
  const inputTokens = entries.reduce((s, e) => s + (e.inputTokens ?? 0), 0)
  const outputTokens = entries.reduce((s, e) => s + (e.outputTokens ?? 0), 0)
  const totalCost = entries.reduce((s, e) => s + (e.cost ?? 0), 0)
  const avgLatencyMs = requests > 0 ? entries.reduce((s, e) => s + (e.latencyMs ?? 0), 0) / requests : 0
  const errorRate = requests > 0 ? entries.filter(e => e.error).length / requests : 0

  return { requests, inputTokens, outputTokens, totalCost, avgLatencyMs, errorRate }
}

export function getFinOps(opts: { userId?: string; orgId?: string; since?: number }): {
  perModel: Record<string, UsageSummary>
  perUser: Record<string, UsageSummary>
  total: UsageSummary
} {
  let entries = _requestLog
  if (opts.since) entries = entries.filter(e => e.timestamp >= opts.since!)

  const byModel: Record<string, RequestLogEntry[]> = {}
  const byUser: Record<string, RequestLogEntry[]> = {}
  for (const e of entries) {
    const model = e.model ?? 'unknown'
    const user = e.userId ?? 'anonymous'
    ;(byModel[model] ??= []).push(e)
    ;(byUser[user] ??= []).push(e)
  }

  const summarize = (arr: RequestLogEntry[]): UsageSummary => ({
    requests: arr.length,
    inputTokens: arr.reduce((s, e) => s + (e.inputTokens ?? 0), 0),
    outputTokens: arr.reduce((s, e) => s + (e.outputTokens ?? 0), 0),
    totalCost: arr.reduce((s, e) => s + (e.cost ?? 0), 0),
    avgLatencyMs: arr.length > 0 ? arr.reduce((s, e) => s + (e.latencyMs ?? 0), 0) / arr.length : 0,
    errorRate: arr.length > 0 ? arr.filter(e => e.error).length / arr.length : 0,
  })

  return {
    perModel: Object.fromEntries(Object.entries(byModel).map(([k, v]) => [k, summarize(v)])),
    perUser: Object.fromEntries(Object.entries(byUser).map(([k, v]) => [k, summarize(v)])),
    total: summarize(entries),
  }
}

const COST_PER_1K: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'claude-opus-4-5': { input: 0.015, output: 0.075 },
  'claude-sonnet-4-5': { input: 0.003, output: 0.015 },
  'claude-haiku-3-5': { input: 0.00025, output: 0.00125 },
  'gemini-2.5-pro': { input: 0.00125, output: 0.01 },
  'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
  'deepseek-chat': { input: 0.00027, output: 0.0011 },
  'llama-3.3-70b-versatile': { input: 0.00059, output: 0.00079 },
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = COST_PER_1K[model] ?? { input: 0.001, output: 0.001 }
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output
}
