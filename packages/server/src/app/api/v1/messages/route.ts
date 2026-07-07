// Anthropic-compatible: POST /v1/messages
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { handleGatewayRequest } from '../../../../gateway/gateway.js'
import { resolveRoute } from '../../../../gateway/router.js'
import { checkRateLimit } from '../../../../lib/rate-limit.js'
import { resolveVirtualKey } from '../../../../lib/virtual-keys.js'
import { logRequest } from '../../../../lib/observability.js'
import { checkGuardrails } from '../../../../lib/guardrails/guardrails.js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()

  const authHeader = req.headers.get('x-api-key') ?? req.headers.get('authorization') ?? ''
  const rawKey = authHeader.replace(/^Bearer\s+/i, '').trim()
  const keyRecord = rawKey ? await resolveVirtualKey(rawKey) : null

  if (!rawKey) {
    return NextResponse.json({ type: 'error', error: { type: 'authentication_error', message: 'Missing API key' } }, { status: 401 })
  }

  const rl = await checkRateLimit(rawKey, keyRecord?.userId, keyRecord?.orgId)
  if (!rl.allowed) {
    return NextResponse.json({ type: 'error', error: { type: 'rate_limit_error', message: 'Rate limit exceeded' } }, { status: 429 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ type: 'error', error: { type: 'invalid_request_error', message: 'Invalid JSON' } }, { status: 400 })
  }

  const messages = (body.messages ?? []) as unknown[]
  const stream = Boolean(body.stream)

  const guardResult = await checkGuardrails('input', messages, keyRecord?.userId)
  if (!guardResult.allowed) {
    return NextResponse.json({ type: 'error', error: { type: 'content_policy_violation', message: guardResult.reason } }, { status: 400 })
  }

  const route = await resolveRoute({
    requestedModel: body.model as string | undefined,
    requestedProvider: 'anthropic',  // Anthropic endpoint → prefer Anthropic
    messages, stream,
    userId: keyRecord?.userId,
    orgId: keyRecord?.orgId,
  })

  // Translate Anthropic request → upstream
  const upstreamBody = { ...body, model: route.model }
  const upstreamHeaders: Record<string, string> = {
    'content-type': 'application/json',
    'anthropic-version': '2023-06-01',
    ...(route.extraHeaders ?? {}),
  }
  if (route.apiKey) upstreamHeaders['x-api-key'] = route.apiKey

  const upstream = await fetch(`${route.baseURL.replace(/\/$/, '')}/messages`, {
    method: 'POST',
    headers: upstreamHeaders,
    body: JSON.stringify(upstreamBody),
  })

  const latencyMs = Date.now() - startedAt
  await logRequest({ requestId, userId: keyRecord?.userId, orgId: keyRecord?.orgId, format: 'anthropic', body, provider: route.provider, model: route.model, latencyMs, startedAt })

  const responseHeaders = new Headers(upstream.headers)
  responseHeaders.set('x-request-id', requestId)
  responseHeaders.set('x-provider', route.provider)
  responseHeaders.set('x-latency-ms', String(latencyMs))

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders })
}
