// Audio TTS + STT: POST /v1/audio/speech and /v1/audio/transcriptions
import { NextResponse, type NextRequest } from 'next/server'
import { resolveVirtualKey } from '../../../../../lib/virtual-keys.js'

export const dynamic = 'force-dynamic'

// TTS: POST /v1/audio/speech
export async function POST(req: NextRequest) {
  const rawKey = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  const keyRecord = rawKey ? await resolveVirtualKey(rawKey) : null
  if (!rawKey || !keyRecord) return NextResponse.json({ error: { message: 'Invalid API key' } }, { status: 401 })

  const url = new URL(req.url)
  const endpoint = url.pathname.includes('transcriptions') ? 'transcriptions' : 'speech'

  const upstream = await fetch(`https://api.openai.com/v1/audio/${endpoint}`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
      ...Object.fromEntries([...req.headers.entries()].filter(([k]) => ['content-type', 'accept'].includes(k))),
    },
    body: req.body,
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'audio/mpeg',
    },
  })
}
