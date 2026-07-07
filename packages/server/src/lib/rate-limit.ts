// Layer 4: Rate limiting + quotas + budget enforcement
import { resolveVirtualKey } from './virtual-keys.js'
import { getAnalytics } from './observability.js'

export interface RateLimitResult {
  allowed: boolean
  remaining?: number
  resetAt?: number
  retryAfterMs?: number
}

// Token bucket per key (in-process)
const _buckets = new Map<string, { tokens: number; lastRefill: number }>()
const DEFAULT_RPM = 60
const DEFAULT_TPM = 100_000

function getBucket(key: string, rpm: number): { tokens: number; lastRefill: number } {
  const now = Date.now()
  let bucket = _buckets.get(key)
  if (!bucket) { bucket = { tokens: rpm, lastRefill: now }; _buckets.set(key, bucket) }
  // Refill proportional to time elapsed
  const elapsed = now - bucket.lastRefill
  const refill = (elapsed / 60_000) * rpm
  bucket.tokens = Math.min(rpm, bucket.tokens + refill)
  bucket.lastRefill = now
  return bucket
}

export async function checkRateLimit(rawKey: string, userId?: string, orgId?: string): Promise<RateLimitResult> {
  const keyRecord = rawKey ? await resolveVirtualKey(rawKey) : null
  const rpm = keyRecord?.rateLimit?.rpm ?? DEFAULT_RPM

  const bucket = getBucket(rawKey, rpm)
  if (bucket.tokens < 1) {
    const resetAt = bucket.lastRefill + 60_000
    return { allowed: false, retryAfterMs: resetAt - Date.now(), resetAt }
  }

  bucket.tokens--
  return { allowed: true, remaining: Math.floor(bucket.tokens), resetAt: bucket.lastRefill + 60_000 }
}

export interface QuotaResult {
  allowed: boolean
  reason?: string
}

export async function checkQuota(userId?: string, orgId?: string): Promise<QuotaResult> {
  if (!userId) return { allowed: true }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const analytics = getAnalytics({ userId, since: todayStart.getTime() })

  // Default daily request quota: 1000 requests/day per user
  const DEFAULT_DAILY_REQUESTS = parseInt(process.env.KAIROS_DAILY_REQUEST_QUOTA ?? '1000', 10)
  if (analytics.requests >= DEFAULT_DAILY_REQUESTS) {
    return { allowed: false, reason: `Daily request quota exceeded (${DEFAULT_DAILY_REQUESTS}/day)` }
  }

  // Default daily token quota: 10M tokens/day
  const DEFAULT_DAILY_TOKENS = parseInt(process.env.KAIROS_DAILY_TOKEN_QUOTA ?? '10000000', 10)
  const totalTokens = analytics.inputTokens + analytics.outputTokens
  if (totalTokens >= DEFAULT_DAILY_TOKENS) {
    return { allowed: false, reason: `Daily token quota exceeded (${DEFAULT_DAILY_TOKENS} tokens/day)` }
  }

  // Daily cost budget check
  const DEFAULT_DAILY_BUDGET = parseFloat(process.env.KAIROS_DAILY_BUDGET_USD ?? '100')
  if (analytics.totalCost >= DEFAULT_DAILY_BUDGET) {
    return { allowed: false, reason: `Daily spend budget exceeded ($${DEFAULT_DAILY_BUDGET}/day)` }
  }

  return { allowed: true }
}

export async function recordUsage(userId: string | undefined, orgId: string | undefined, inputTokens: number, outputTokens: number, model: string): Promise<void> {
  // Usage is tracked in observability.ts logRequest — this is a no-op hook for
  // future database-backed quota accounting
}
