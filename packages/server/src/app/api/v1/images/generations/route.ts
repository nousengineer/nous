// Image generation/understanding stub: POST /v1/images/generations
import { NextResponse, type NextRequest } from 'next/server'
import { resolveVirtualKey } from '../../../../../lib/virtual-keys.js'
import { checkRateLimit } from '../../../../../lib/rate-limit.js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const rawKey = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  const keyRecord = rawKey ? await resolveVirtualKey(rawKey) : null
  if (!rawKey || !keyRecord) return NextResponse.json({ error: { message: 'Invalid API key' } }, { status: 401 })

  const rl = await checkRateLimit(rawKey, keyRecord.userId, keyRecord.orgId)
  if (!rl.allowed) return NextResponse.json({ error: { message: 'Rate limit exceeded' } }, { status: 429 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON' } }, { status: 400 })
  }

  // Route to appropriate image provider
  const model = String(body.model ?? 'dall-e-3')
  const provider = resolveImageProvider(model)

  const upstream = await fetch(`${provider.baseURL}/images/generations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'authorization': `Bearer ${provider.apiKey}` },
    body: JSON.stringify({ ...body, model }),
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}

function resolveImageProvider(model: string): { baseURL: string; apiKey: string } {
  if (model.includes('dall-e') || model.includes('gpt-image')) {
    return { baseURL: 'https://api.openai.com/v1', apiKey: process.env.OPENAI_API_KEY ?? '' }
  }
  if (model.includes('imagen') || model.includes('gemini')) {
    return { baseURL: 'https://generativelanguage.googleapis.com/v1beta', apiKey: process.env.GEMINI_API_KEY ?? '' }
  }
  return { baseURL: 'https://api.openai.com/v1', apiKey: process.env.OPENAI_API_KEY ?? '' }
}
