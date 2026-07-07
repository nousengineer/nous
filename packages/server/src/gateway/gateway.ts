// Gateway core: request logging, routing resolution, and upstream proxy
import type { NextRequest } from 'next/server'
import { resolveRoute } from './router.js'
import { logRequest } from '../lib/observability.js'
import { checkGuardrails } from '../lib/guardrails/guardrails.js'
import { checkRateLimit } from '../lib/rate-limit.js'
import { resolveVirtualKey } from '../lib/virtual-keys.js'
import { checkQuota, recordUsage } from '../lib/rate-limit.js'
import { semanticCacheGet, semanticCacheSet } from '../lib/cache/semantic-cache.js'

export type GatewayRequest = {
  requestId: string
  apiKey: string            // virtual key or firebase token
  userId?: string
  orgId?: string
  provider: string
  model: string
  messages: unknown[]
  stream: boolean
  body: Record<string, unknown>
  rawHeaders: Record<string, string>
  startedAt: number
}

export type GatewayResult = {
  status: number
  headers: Record<string, string>
  body: ReadableStream | unknown
  provider: string
  model: string
  inputTokens?: number
  outputTokens?: number
  cached: boolean
  latencyMs: number
}

export async function handleGatewayRequest(
  req: NextRequest,
  format: 'openai' | 'anthropic' | 'native',
): Promise<Response> {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()

  // 1. Auth — virtual key or bearer token
  const authHeader = req.headers.get('authorization') ?? ''
  const rawKey = authHeader.replace(/^Bearer\s+/i, '').trim()
  const keyRecord = rawKey ? await resolveVirtualKey(rawKey) : null
  const userId = keyRecord?.userId
  const orgId = keyRecord?.orgId

  if (!rawKey) {
    return new Response(JSON.stringify({ error: { message: 'Missing API key', type: 'auth_error' } }), {
      status: 401, headers: { 'content-type': 'application/json' },
    })
  }

  // 2. Rate limit
  const rl = await checkRateLimit(rawKey, userId, orgId)
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: { message: 'Rate limit exceeded', type: 'rate_limit_error' } }), {
      status: 429, headers: { 'content-type': 'application/json', 'retry-after': String(Math.ceil(rl.retryAfterMs! / 1000)) },
    })
  }

  // 3. Parse body
  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: { message: 'Invalid JSON body', type: 'invalid_request_error' } }), {
      status: 400, headers: { 'content-type': 'application/json' },
    })
  }

  const messages = (body.messages ?? []) as unknown[]
  const stream = Boolean(body.stream)

  // 4. Guardrails on input
  const guardResult = await checkGuardrails('input', messages, userId)
  if (!guardResult.allowed) {
    await logRequest({ requestId, userId, orgId, format, body, blocked: true, blockReason: guardResult.reason, startedAt })
    return new Response(JSON.stringify({ error: { message: guardResult.reason, type: 'content_policy_violation' } }), {
      status: 400, headers: { 'content-type': 'application/json' },
    })
  }

  // 5. Semantic cache (non-streaming only)
  if (!stream) {
    const cached = await semanticCacheGet(messages, body.model as string | undefined)
    if (cached) {
      await logRequest({ requestId, userId, orgId, format, body, cached: true, startedAt, response: cached })
      return new Response(JSON.stringify(cached), {
        status: 200, headers: { 'content-type': 'application/json', 'x-cache': 'HIT', 'x-request-id': requestId },
      })
    }
  }

  // 6. Quota check
  const quota = await checkQuota(userId, orgId)
  if (!quota.allowed) {
    return new Response(JSON.stringify({ error: { message: `Quota exceeded: ${quota.reason}`, type: 'quota_exceeded' } }), {
      status: 429, headers: { 'content-type': 'application/json' },
    })
  }

  // 7. Intelligent routing
  const route = await resolveRoute({
    requestedModel: body.model as string | undefined,
    requestedProvider: keyRecord?.defaultProvider,
    messages,
    stream,
    userId,
    orgId,
  })

  // 8. Forward to upstream provider
  const upstreamResponse = await forwardToProvider(route, body, stream)
  const latencyMs = Date.now() - startedAt

  // 9. Log + record usage
  await logRequest({ requestId, userId, orgId, format, body, provider: route.provider, model: route.model, latencyMs, startedAt })
  if (upstreamResponse.ok && !stream) {
    const responseBody = await upstreamResponse.clone().json().catch(() => null)
    if (responseBody) {
      const usage = extractUsage(responseBody)
      await recordUsage(userId, orgId, usage.inputTokens, usage.outputTokens, route.model)
      await semanticCacheSet(messages, body.model as string | undefined, responseBody)
    }
  }

  // 10. Stream response back with gateway headers
  const headers = new Headers(upstreamResponse.headers)
  headers.set('x-request-id', requestId)
  headers.set('x-provider', route.provider)
  headers.set('x-model', route.model)
  headers.set('x-latency-ms', String(latencyMs))
  headers.set('x-cache', 'MISS')

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  })
}

async function forwardToProvider(
  route: { provider: string; model: string; baseURL: string; apiKey?: string; authToken?: string; extraHeaders?: Record<string, string> },
  body: Record<string, unknown>,
  _stream: boolean,
): Promise<Response> {
  const url = `${route.baseURL.replace(/\/$/, '')}/chat/completions`
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...route.extraHeaders,
  }
  if (route.apiKey) headers['authorization'] = `Bearer ${route.apiKey}`
  if (route.authToken) headers['x-auth-token'] = route.authToken

  // Anthropic-style: use x-api-key header
  if (route.provider === 'anthropic') {
    if (route.apiKey) { headers['x-api-key'] = route.apiKey; delete headers['authorization'] }
    headers['anthropic-version'] = '2023-06-01'
  }

  const upstreamBody = { ...body, model: route.model }

  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(upstreamBody),
  })
}

function extractUsage(body: unknown): { inputTokens: number; outputTokens: number } {
  const b = body as Record<string, any>
  const usage = b.usage ?? b.usageMetadata ?? {}
  return {
    inputTokens: usage.prompt_tokens ?? usage.input_tokens ?? usage.promptTokenCount ?? 0,
    outputTokens: usage.completion_tokens ?? usage.output_tokens ?? usage.candidatesTokenCount ?? 0,
  }
}
