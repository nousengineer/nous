// OpenAI-compatible: POST /v1/chat/completions
import type { NextRequest } from 'next/server'
import { handleGatewayRequest } from '../../../../../gateway/gateway.js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  return handleGatewayRequest(req, 'openai')
}
