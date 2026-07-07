// Embeddings: POST /v1/embeddings
import { NextResponse, type NextRequest } from 'next/server'
import { resolveVirtualKey } from '../../../../lib/virtual-keys.js'
import { resolveProvider } from '@chronokairo/sdk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const rawKey = authHeader.replace(/^Bearer\s+/i, '').trim()
  const keyRecord = rawKey ? await resolveVirtualKey(rawKey) : null
  if (!rawKey || !keyRecord) return NextResponse.json({ error: { message: 'Invalid API key' } }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON' } }, { status: 400 })
  }

  const model = String(body.model ?? 'text-embedding-3-small')
  const input = body.input

  // Route to appropriate embedding provider
  const embeddingProvider = resolveEmbeddingProvider(model)
  const resolved = resolveProvider(embeddingProvider, { model })

  const upstream = await fetch(`${resolved.baseURL.replace(/\/$/, '')}/embeddings`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${resolved.apiKey ?? ''}`,
    },
    body: JSON.stringify({ model, input }),
  })

  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}

function resolveEmbeddingProvider(model: string): string {
  if (model.includes('text-embedding')) return 'openai'
  if (model.includes('nomic') || model.includes('llama')) return 'ollama'
  if (model.includes('embed')) return 'openai'
  return 'openai'
}
