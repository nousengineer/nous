// Layer 9: SSE streaming endpoint + webhook dispatcher
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { loadConfig } from './config.js'

// ─── SSE helpers ─────────────────────────────────────────────────────────────

export function createSSEStream(
  upstream: ReadableStream | null,
  onChunk?: (chunk: string) => void,
): ReadableStream {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      if (!upstream) {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
        return
      }
      const reader = upstream.getReader()
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          onChunk?.(text)
          controller.enqueue(value)
        }
      } finally {
        controller.close()
        reader.releaseLock()
      }
    },
  })
}

// ─── Webhook dispatcher ───────────────────────────────────────────────────────

export interface WebhookTarget {
  id: string
  url: string
  secret?: string
  events: string[]     // e.g. ['request.completed', 'agent.done', 'budget.exceeded']
  userId: string
  orgId?: string
  enabled: boolean
  createdAt: number
  lastCalledAt?: number
  failureCount: number
}

export type WebhookEvent =
  | 'request.completed'
  | 'request.failed'
  | 'agent.started'
  | 'agent.done'
  | 'agent.failed'
  | 'budget.exceeded'
  | 'quota.exceeded'
  | 'guardrail.blocked'
  | 'mcp.tool_called'

// In-memory webhook registry
const _webhooks = new Map<string, WebhookTarget>()

export function registerWebhook(target: Omit<WebhookTarget, 'id' | 'createdAt' | 'failureCount'>): WebhookTarget {
  const wh: WebhookTarget = { ...target, id: crypto.randomUUID(), createdAt: Date.now(), failureCount: 0 }
  _webhooks.set(wh.id, wh)
  return wh
}

export function listWebhooks(userId?: string): WebhookTarget[] {
  return [..._webhooks.values()].filter(wh => !userId || wh.userId === userId)
}

export function deleteWebhook(id: string): void { _webhooks.delete(id) }

export async function dispatchWebhook(event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
  const targets = [..._webhooks.values()].filter(wh => wh.enabled && wh.events.includes(event))
  const body = JSON.stringify({ event, timestamp: Date.now(), ...payload })

  await Promise.allSettled(targets.map(async (wh) => {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-kairos-event': event,
    }
    if (wh.secret) {
      // HMAC-SHA256 signature
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(wh.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
      headers['x-kairos-signature'] = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
    }
    try {
      wh.lastCalledAt = Date.now()
      const resp = await fetch(wh.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) })
      if (!resp.ok) wh.failureCount++
    } catch {
      wh.failureCount++
      if (wh.failureCount > 10) wh.enabled = false  // disable after 10 consecutive failures
    }
  }))
}
