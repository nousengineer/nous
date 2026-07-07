// Intelligent routing engine: cost/quality/latency/health-aware provider selection
import { resolveProvider, type ResolvedProvider } from '@chronokairo/sdk'

export type RoutingStrategy = 'cost' | 'quality' | 'latency' | 'balanced'

export interface ProviderHealth {
  provider: string
  healthy: boolean
  errorRate: number        // 0–1 over last 60s
  avgLatencyMs: number
  lastChecked: number
  consecutiveErrors: number
}

export interface ModelCostTable {
  [model: string]: { inputPer1k: number; outputPer1k: number }  // USD
}

export interface RouteRequest {
  requestedModel?: string
  requestedProvider?: string
  messages: unknown[]
  stream: boolean
  userId?: string
  orgId?: string
  strategy?: RoutingStrategy
}

export interface RouteResult extends ResolvedProvider {
  provider: string
  model: string
  baseURL: string
  extraHeaders?: Record<string, string>
  routingReason: string
}

// ─── Provider health store (in-process, survives requests via module scope) ──
const healthStore = new Map<string, ProviderHealth>()

export function recordProviderOutcome(provider: string, latencyMs: number, success: boolean): void {
  const h = healthStore.get(provider) ?? {
    provider, healthy: true, errorRate: 0, avgLatencyMs: 500,
    lastChecked: Date.now(), consecutiveErrors: 0,
  }
  h.avgLatencyMs = (h.avgLatencyMs * 0.9 + latencyMs * 0.1)  // EMA
  if (success) {
    h.consecutiveErrors = 0
    h.errorRate = Math.max(0, h.errorRate - 0.05)
  } else {
    h.consecutiveErrors++
    h.errorRate = Math.min(1, h.errorRate + 0.2)
  }
  h.healthy = h.consecutiveErrors < 3 && h.errorRate < 0.5
  h.lastChecked = Date.now()
  healthStore.set(provider, h)
}

export function getProviderHealth(provider: string): ProviderHealth {
  return healthStore.get(provider) ?? {
    provider, healthy: true, errorRate: 0, avgLatencyMs: 500,
    lastChecked: 0, consecutiveErrors: 0,
  }
}

// ─── Cost table ───────────────────────────────────────────────────────────────
const COST_TABLE: ModelCostTable = {
  // Anthropic
  'claude-opus-4-5': { inputPer1k: 0.015, outputPer1k: 0.075 },
  'claude-sonnet-4-5': { inputPer1k: 0.003, outputPer1k: 0.015 },
  'claude-haiku-3-5': { inputPer1k: 0.00025, outputPer1k: 0.00125 },
  // OpenAI
  'gpt-4o': { inputPer1k: 0.005, outputPer1k: 0.015 },
  'gpt-4o-mini': { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  'o3': { inputPer1k: 0.01, outputPer1k: 0.04 },
  // Google
  'gemini-2.0-flash': { inputPer1k: 0.0001, outputPer1k: 0.0004 },
  'gemini-2.5-pro': { inputPer1k: 0.00125, outputPer1k: 0.01 },
  // DeepSeek
  'deepseek-chat': { inputPer1k: 0.00027, outputPer1k: 0.0011 },
  // Groq (fast inference)
  'llama-3.3-70b-versatile': { inputPer1k: 0.00059, outputPer1k: 0.00079 },
  // Free/local
  'llama3.2': { inputPer1k: 0, outputPer1k: 0 },
}

// ─── Quality tiers by task ────────────────────────────────────────────────────
const QUALITY_RANKINGS: Record<string, string[]> = {
  coding: ['claude-opus-4-5', 'claude-sonnet-4-5', 'gpt-4o', 'deepseek-chat'],
  reasoning: ['o3', 'claude-opus-4-5', 'gemini-2.5-pro'],
  translation: ['gpt-4o', 'gemini-2.5-pro', 'claude-sonnet-4-5'],
  vision: ['gpt-4o', 'gemini-2.5-pro', 'claude-opus-4-5'],
  simple: ['gpt-4o-mini', 'gemini-2.0-flash', 'claude-haiku-3-5', 'deepseek-chat'],
}

function detectTaskType(messages: unknown[]): keyof typeof QUALITY_RANKINGS {
  const text = JSON.stringify(messages).toLowerCase()
  if (/code|function|class|debug|fix|implement|typescript|python|javascript/.test(text)) return 'coding'
  if (/reason|think|math|logic|proof|solve/.test(text)) return 'reasoning'
  if (/translat|french|spanish|german|portuguese|chinese|japanese/.test(text)) return 'translation'
  if (/image|picture|photo|screenshot|describe|visual/.test(text)) return 'vision'
  return 'simple'
}

function estimateCost(model: string, messages: unknown[]): number {
  const cost = COST_TABLE[model]
  if (!cost) return 999
  const chars = JSON.stringify(messages).length
  const estTokens = chars / 4
  return (estTokens / 1000) * cost.inputPer1k
}

// ─── Main routing function ────────────────────────────────────────────────────
export async function resolveRoute(req: RouteRequest): Promise<RouteResult> {
  // If a specific provider+model is requested, use it (with health fallback)
  if (req.requestedProvider || req.requestedModel) {
    const provider = req.requestedProvider ?? 'chronokairo'
    const model = req.requestedModel ?? ''
    const health = getProviderHealth(provider)

    if (!health.healthy) {
      // Fallback to next healthy provider for same model class
      const fallback = findHealthyFallback(model, provider)
      if (fallback) {
        const resolved = resolveProvider(fallback.provider, { model: fallback.model })
        return { ...resolved, provider: fallback.provider, model: fallback.model, baseURL: resolved.baseURL, routingReason: `Health fallback: ${provider} unhealthy → ${fallback.provider}` }
      }
    }

    const resolved = resolveProvider(provider, { model: model || undefined })
    return { ...resolved, provider, model: resolved.model ?? model, baseURL: resolved.baseURL, routingReason: 'Explicit provider/model' }
  }

  const strategy = req.strategy ?? 'balanced'

  switch (strategy) {
    case 'cost': {
      // Find cheapest healthy model
      const sorted = Object.entries(COST_TABLE)
        .filter(([m]) => {
          const prov = inferProvider(m)
          return prov && getProviderHealth(prov).healthy
        })
        .sort((a, b) => (a[1].inputPer1k + a[1].outputPer1k) - (b[1].inputPer1k + b[1].outputPer1k))
      const [model] = sorted[0] ?? ['gpt-4o-mini']
      const provider = inferProvider(model) ?? 'openai'
      const resolved = resolveProvider(provider, { model })
      return { ...resolved, provider, model, baseURL: resolved.baseURL, routingReason: `Cost routing: cheapest healthy model` }
    }

    case 'quality': {
      const taskType = detectTaskType(req.messages)
      const ranking = QUALITY_RANKINGS[taskType] ?? QUALITY_RANKINGS.simple
      for (const model of ranking) {
        const prov = inferProvider(model)
        if (prov && getProviderHealth(prov).healthy) {
          const resolved = resolveProvider(prov, { model })
          return { ...resolved, provider: prov, model, baseURL: resolved.baseURL, routingReason: `Quality routing: best ${taskType} model` }
        }
      }
      break
    }

    case 'latency': {
      // Fastest: lowest avgLatencyMs among healthy providers
      const candidates = [
        { provider: 'groq', model: 'llama-3.3-70b-versatile' },
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'google', model: 'gemini-2.0-flash' },
        { provider: 'chronokairo', model: '' },
      ]
      const healthy = candidates.filter(c => getProviderHealth(c.provider).healthy)
        .sort((a, b) => getProviderHealth(a.provider).avgLatencyMs - getProviderHealth(b.provider).avgLatencyMs)
      const best = healthy[0] ?? candidates[0]
      const resolved = resolveProvider(best.provider, { model: best.model || undefined })
      return { ...resolved, provider: best.provider, model: best.model || resolved.model || '', baseURL: resolved.baseURL, routingReason: `Latency routing: fastest healthy provider` }
    }
  }

  // Balanced: quality-weighted, cost-adjusted
  const taskType = detectTaskType(req.messages)
  const ranking = QUALITY_RANKINGS[taskType] ?? QUALITY_RANKINGS.simple
  for (const model of ranking) {
    const prov = inferProvider(model)
    if (prov && getProviderHealth(prov).healthy) {
      const resolved = resolveProvider(prov, { model })
      return { ...resolved, provider: prov, model, baseURL: resolved.baseURL, routingReason: `Balanced routing: ${taskType}` }
    }
  }

  // Last resort fallback
  const resolved = resolveProvider('openai', { model: 'gpt-4o-mini' })
  return { ...resolved, provider: 'openai', model: 'gpt-4o-mini', baseURL: resolved.baseURL, routingReason: 'Fallback: all preferred providers unavailable' }
}

function inferProvider(model: string): string | null {
  if (model.startsWith('claude')) return 'anthropic'
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'openai'
  if (model.startsWith('gemini')) return 'google'
  if (model.startsWith('deepseek')) return 'deepseek'
  if (model.startsWith('llama') || model.includes('versatile') || model.includes('groq')) return 'groq'
  if (model.startsWith('qwen')) return 'qwen'
  if (model.startsWith('grok')) return 'xai'
  return null
}

function findHealthyFallback(model: string, excludeProvider: string): { provider: string; model: string } | null {
  const taskType = detectTaskType([{ role: 'user', content: `task requiring ${model}` }])
  const ranking = QUALITY_RANKINGS[taskType] ?? QUALITY_RANKINGS.simple
  for (const m of ranking) {
    const prov = inferProvider(m)
    if (prov && prov !== excludeProvider && getProviderHealth(prov).healthy) {
      return { provider: prov, model: m }
    }
  }
  return null
}
