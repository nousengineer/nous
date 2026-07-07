// Webhooks API: GET/POST/DELETE /api/webhooks
import { NextResponse, type NextRequest } from 'next/server'
import { getServerSession, requireRole } from '@/lib/auth'
import { registerWebhook, listWebhooks, deleteWebhook } from '@/lib/webhooks'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getServerSession()
  if (!requireRole(user)) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  const webhooks = listWebhooks(user!.role === 'admin' ? undefined : user!.uid)
  return NextResponse.json({ webhooks: webhooks.map(wh => ({ ...wh, secret: wh.secret ? '***' : undefined })) })
}

export async function POST(req: NextRequest) {
  const user = await getServerSession()
  if (!requireRole(user)) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (!body.url || !body.events?.length) {
    return NextResponse.json({ error: 'url and events are required' }, { status: 400 })
  }
  const wh = registerWebhook({
    url: body.url,
    secret: body.secret,
    events: body.events,
    userId: user!.uid,
    orgId: body.orgId,
    enabled: true,
  })
  return NextResponse.json({ webhook: { ...wh, secret: wh.secret ? '***' : undefined } }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getServerSession()
  if (!requireRole(user)) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  deleteWebhook(id)
  return NextResponse.json({ deleted: id })
}
