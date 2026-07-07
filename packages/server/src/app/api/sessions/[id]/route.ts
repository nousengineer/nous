import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, requireRole } from '@/lib/auth'
import { loadConfig } from '@/lib/config'

const { SessionStore } = await import('@/lib/session-store')
const config = loadConfig()
const store = new SessionStore(config.workspace)
await store.init()

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession()
  if (!requireRole(user)) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  const { id } = await params
  const session = store.get(id)
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (user!.role !== 'admin' && session.userId !== user!.uid) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  store.touch(id)
  return NextResponse.json(session)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerSession()
  if (!requireRole(user)) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  const { id } = await params
  const session = store.get(id)
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (user!.role !== 'admin' && session.userId !== user!.uid) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  store.remove(id)
  return NextResponse.json({ ok: true })
}
