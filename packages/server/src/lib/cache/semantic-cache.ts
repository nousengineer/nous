// Layer 5: Semantic cache — avoid duplicate LLM calls
import { createHash } from 'node:crypto'

interface CacheEntry {
  key: string
  response: unknown
  createdAt: number
  hits: number
}

const _cache = new Map<string, CacheEntry>()
const TTL_MS = parseInt(process.env.KAIROS_CACHE_TTL_MS ?? String(5 * 60 * 1000), 10)  // 5 min default
const MAX_ENTRIES = parseInt(process.env.KAIROS_CACHE_MAX_ENTRIES ?? '1000', 10)

function cacheKey(messages: unknown[], model?: string): string {
  const payload = JSON.stringify({ messages, model: model ?? '' })
  return createHash('sha256').update(payload).digest('hex')
}

export async function semanticCacheGet(messages: unknown[], model?: string): Promise<unknown | null> {
  const key = cacheKey(messages, model)
  const entry = _cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.createdAt > TTL_MS) { _cache.delete(key); return null }
  entry.hits++
  return entry.response
}

export async function semanticCacheSet(messages: unknown[], model: string | undefined, response: unknown): Promise<void> {
  if (_cache.size >= MAX_ENTRIES) {
    // Evict oldest
    const oldest = [..._cache.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0]
    if (oldest) _cache.delete(oldest[0])
  }
  const key = cacheKey(messages, model)
  _cache.set(key, { key, response, createdAt: Date.now(), hits: 0 })
}

export function getCacheStats(): { size: number; hitRate: number; ttlMs: number } {
  const entries = [..._cache.values()]
  const totalHits = entries.reduce((s, e) => s + e.hits, 0)
  const totalRequests = entries.length + totalHits
  return {
    size: _cache.size,
    hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
    ttlMs: TTL_MS,
  }
}

export function clearCache(): void { _cache.clear() }
