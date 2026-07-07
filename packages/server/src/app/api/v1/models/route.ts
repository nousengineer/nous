// List available models: GET /v1/models
import { NextResponse } from 'next/server'
import { resolveVirtualKey } from '../../../../lib/virtual-keys.js'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const MODELS = [
  // Anthropic
  { id: 'claude-opus-4-5', object: 'model', owned_by: 'anthropic', created: 1700000000 },
  { id: 'claude-sonnet-4-5', object: 'model', owned_by: 'anthropic', created: 1700000001 },
  { id: 'claude-haiku-3-5', object: 'model', owned_by: 'anthropic', created: 1700000002 },
  // OpenAI
  { id: 'gpt-4o', object: 'model', owned_by: 'openai', created: 1700000010 },
  { id: 'gpt-4o-mini', object: 'model', owned_by: 'openai', created: 1700000011 },
  { id: 'o3', object: 'model', owned_by: 'openai', created: 1700000012 },
  // Google
  { id: 'gemini-2.5-pro', object: 'model', owned_by: 'google', created: 1700000020 },
  { id: 'gemini-2.0-flash', object: 'model', owned_by: 'google', created: 1700000021 },
  // DeepSeek
  { id: 'deepseek-chat', object: 'model', owned_by: 'deepseek', created: 1700000030 },
  // Groq
  { id: 'llama-3.3-70b-versatile', object: 'model', owned_by: 'groq', created: 1700000040 },
  // xAI
  { id: 'grok-3', object: 'model', owned_by: 'xai', created: 1700000050 },
  // Qwen
  { id: 'qwen2.5-72b-instruct', object: 'model', owned_by: 'alibaba', created: 1700000060 },
  // Mistral
  { id: 'mistral-large-latest', object: 'model', owned_by: 'mistral', created: 1700000070 },
  // Kairos own
  { id: 'kairos-4-5-sonnet', object: 'model', owned_by: 'chronokairo', created: 1700000080 },
]

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const rawKey = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!rawKey) return NextResponse.json({ error: { message: 'Missing API key' } }, { status: 401 })
  const keyRecord = await resolveVirtualKey(rawKey)
  if (!keyRecord) return NextResponse.json({ error: { message: 'Invalid API key' } }, { status: 401 })
  return NextResponse.json({ object: 'list', data: MODELS })
}
